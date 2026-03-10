import { requestService } from './request.service';
import { cacheService } from './cache.service';
import DramaModel from '../models/Drama';
import crypto from 'crypto';

export interface Drama {
  id: string;
  title: string;
  cover: string;
  chapters: number;
  description: string;
  playCount: string;
  tags: string[];
  rank?: string;
  episode_1_url?: string;
}

export interface DramaDetail {
  id: string;
  title: string;
  description: string;
  cover: string;
  total_episodes: number;
  playCount?: string;
}

export interface Stream {
  quality: string;
  url: string;
  type: string;
}

export interface StreamData {
  id: string;
  streams: Stream[];
}

export interface FeedCategory {
  id: string;
  name: string;
}

export class DramaboxService {
  private readonly PAGE_SIZE = 20;
  private readonly LOOKAHEAD_PAGES = 2;
  private readonly MIN_FOR_YOU_POOL = 100;
  private readonly MIN_SECONDARY_POOL = 60;
  private readonly FEED_CACHE_VERSION = 'v3';

  private normalizeLang(lang: string = 'in'): string {
    return lang === 'id' ? 'in' : lang;
  }

  private isDbReady(): boolean {
    return DramaModel.db?.readyState === 1;
  }

  private dedupeDramas(dramas: Drama[]): Drama[] {
    return Array.from(new Map(dramas.map((drama) => [drama.id, drama])).values());
  }

  private getCategoryId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private async saveDramasToDb(dramas: Drama[], lang: string) {
    if (!dramas.length) {
      return;
    }

    const normalizedLang = this.normalizeLang(lang);
    const uniqueDramas = this.dedupeDramas(dramas);

    try {
      await DramaModel.bulkWrite(uniqueDramas.map((drama) => ({
        updateOne: {
          filter: { id: drama.id, lang: normalizedLang },
          update: { $set: { ...drama, lang: normalizedLang, last_updated: new Date() } },
          upsert: true
        }
      })), { ordered: false });
    } catch {
      // Ignore cache persistence failures; upstream data should still be served.
    }
  }

  private toDrama(m: any): Drama {
    return {
      id: String(m.bookId || m.id || ""),
      title: String(m.bookName || m.name || m.title || "Unknown Drama"),
      cover: String(m.coverWap || m.cover || ""),
      chapters: Number(m.chapterCount || m.chapters || 0),
      description: String(m.introduction || m.description || m.intro || ""),
      playCount: String(m.playCount || "0"),
      tags: Array.isArray(m.tags) ? m.tags.map(String) : (Array.isArray(m.tagV3s) ? m.tagV3s.map((t:any) => t.tagName) : []),
      rank: m.rankVo?.recCopy
    };
  }

  private parseTheaterResponse(data: any, lang: string): Drama[] {
    const list: Drama[] = [];
    data?.data?.columnVoList?.forEach((col: any) => col.bookList?.forEach((b: any) => {
      list.push(this.toDrama(b));
    }));
    data?.data?.bannerList?.forEach((b: any) => {
      list.push(this.toDrama(b));
    });
    void this.saveDramasToDb(list, lang);
    return list;
  }

  private parseClassifyResponse(data: any, lang: string): Drama[] {
    const records = data?.data?.classifyBookList?.records;
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const list = records.map((item: any) => this.toDrama(item));
    void this.saveDramasToDb(list, lang);
    return list;
  }

  private async getCatalogFallback(
    excludeIds: string[],
    limit: number,
    mode: 'foryou' | 'trending' | 'newest' | 'category',
    lang: string
  ): Promise<Drama[]> {
    if (limit <= 0) {
      return [];
    }
    if (!this.isDbReady()) {
      return [];
    }

    const normalizedLang = this.normalizeLang(lang);
    try {
      const query = DramaModel.find({ id: { $nin: excludeIds }, lang: normalizedLang })
        .limit(limit)
        .lean();

      if (mode === 'trending') {
        query.sort({ playCount: -1, last_updated: -1 });
      } else {
        query.sort({ last_updated: -1, playCount: -1 });
      }

      const rows = await query;
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        cover: row.cover,
        chapters: row.chapters,
        description: row.description,
        playCount: row.playCount,
        tags: row.tags || [],
        rank: row.rank
      }));
    } catch {
      return [];
    }
  }

  private async getPagedUniqueFeed(
    fetcher: (page: number, limit: number) => Promise<Drama[]>,
    page: number,
    limit: number,
    cacheKey: string,
    lang: string,
    mode: 'foryou' | 'trending' | 'newest' | 'category' = 'foryou'
  ): Promise<{ items: Drama[]; has_more: boolean; page: number }> {
    const cached = await cacheService.get<{ items: Drama[]; has_more: boolean; page: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    const targetCount = page * limit;
    const sourcePageSize = Math.max(limit, this.PAGE_SIZE);
    const collected: Drama[] = [];
    let sourcePage = 1;
    let keepScanning = true;
    const maxSourcePage = page + this.LOOKAHEAD_PAGES + Math.ceil(targetCount / sourcePageSize);

    while (keepScanning && sourcePage <= maxSourcePage) {
      const sourceItems = await fetcher(sourcePage, sourcePageSize);
      if (!sourceItems.length) {
        keepScanning = false;
        break;
      }

      collected.push(...sourceItems);
      const uniqueCount = this.dedupeDramas(collected).length;
      keepScanning = sourceItems.length >= sourcePageSize && uniqueCount < targetCount + limit;
      sourcePage += 1;
    }

    let uniqueItems = this.dedupeDramas(collected);
    const minimumPoolSize = mode === 'foryou' ? this.MIN_FOR_YOU_POOL : this.MIN_SECONDARY_POOL;

    if (uniqueItems.length < minimumPoolSize) {
      const fallbackItems = await this.getCatalogFallback(
        uniqueItems.map((item) => item.id),
        minimumPoolSize - uniqueItems.length,
        mode,
        lang
      );
      uniqueItems = this.dedupeDramas([...uniqueItems, ...fallbackItems]);
    }

    const offset = (page - 1) * limit;
    const items = uniqueItems.slice(offset, offset + limit);
    const result = {
      items,
      has_more: offset + items.length < uniqueItems.length,
      page
    };

    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  async getForYou(lang: string = 'in', page: number = 1, limit: number = this.PAGE_SIZE): Promise<Drama[]> {
    const normalizedLang = this.normalizeLang(lang);
    const theaterData = await requestService.request('/drama-box/he001/theater', {
      homePageStyle: 0, 
      isNeedRank: 1, 
      isNeedNewChannel: 1, 
      type: 0, 
      pageNo: page, 
      pageSize: limit 
    }, normalizedLang);
    let merged = this.parseTheaterResponse(theaterData, normalizedLang);

    // Http.txt shows classify supports true pageNo/pageSize pagination with broad catalog records.
    // Merge it to increase unique drama pool for infinite-scroll feeds.
    try {
      const classifyData = await requestService.request('/drama-box/he001/classify', {
        typeList: [],
        showLabels: true,
        pageNo: page,
        pageSize: limit
      }, normalizedLang);
      const classifyList = this.parseClassifyResponse(classifyData, normalizedLang);
      if (classifyList.length > 0) {
        merged = this.dedupeDramas([...classifyList, ...merged]);
      }
    } catch {
      // Keep theater data when classify fails.
    }

    return merged;
  }

  async getTrending(lang: string = 'in', page: number = 1, limit: number = this.PAGE_SIZE): Promise<Drama[]> {
    const normalizedLang = this.normalizeLang(lang);
    const data = await requestService.request('/drama-box/he001/theater', { 
      newChannelStyle: 1, 
      isNeedRank: 1, 
      pageNo: page, 
      pageSize: limit, 
      index: 0, 
      channelId: 92 
    }, normalizedLang);
    return this.parseTheaterResponse(data, normalizedLang);
  }

  async getNewest(lang: string = 'in', page: number = 1, limit: number = this.PAGE_SIZE): Promise<Drama[]> {
    const normalizedLang = this.normalizeLang(lang);
    const data = await requestService.request('/drama-box/he001/theater', { 
      newChannelStyle: 1,
      isNeedRank: 1,
      pageNo: page,
      pageSize: limit,
      index: 1,
      channelId: 43
    }, normalizedLang);
    return this.parseTheaterResponse(data, normalizedLang);
  }

  async getHomeData(
    lang: string = 'in',
    page: number = 1,
    limit: number = this.PAGE_SIZE
  ): Promise<{ forYou: Drama[], trending: Drama[], newest: Drama[], has_more: boolean, page: number, categories: FeedCategory[] }> {
    const [forYouFeed, trendingFeed, newestFeed, categories] = await Promise.all([
      this.getForYouFeed(lang, page, limit),
      this.getTrendingFeed(lang, page, limit),
      this.getNewestFeed(lang, page, limit),
      this.getCategories(lang)
    ]);

    return {
      forYou: forYouFeed.items,
      trending: trendingFeed.items,
      newest: newestFeed.items,
      categories,
      has_more: forYouFeed.has_more,
      page
    };
  }

  async getForYouFeed(lang: string = 'in', page: number = 1, limit: number = this.PAGE_SIZE) {
    const normalizedLang = this.normalizeLang(lang);
    return this.getPagedUniqueFeed(
      (sourcePage, sourceLimit) => this.getForYou(normalizedLang, sourcePage, sourceLimit),
      page,
      limit,
      `dramabox:${this.FEED_CACHE_VERSION}:feed:foryou:${normalizedLang}:${page}:${limit}`,
      normalizedLang,
      'foryou'
    );
  }

  async getTrendingFeed(lang: string = 'in', page: number = 1, limit: number = this.PAGE_SIZE) {
    const normalizedLang = this.normalizeLang(lang);
    return this.getPagedUniqueFeed(
      (sourcePage, sourceLimit) => this.getTrending(normalizedLang, sourcePage, sourceLimit),
      page,
      limit,
      `dramabox:${this.FEED_CACHE_VERSION}:feed:trending:${normalizedLang}:${page}:${limit}`,
      normalizedLang,
      'trending'
    );
  }

  async getNewestFeed(lang: string = 'in', page: number = 1, limit: number = this.PAGE_SIZE) {
    const normalizedLang = this.normalizeLang(lang);
    return this.getPagedUniqueFeed(
      (sourcePage, sourceLimit) => this.getNewest(normalizedLang, sourcePage, sourceLimit),
      page,
      limit,
      `dramabox:${this.FEED_CACHE_VERSION}:feed:newest:${normalizedLang}:${page}:${limit}`,
      normalizedLang,
      'newest'
    );
  }

  async getVip(lang: string = 'in'): Promise<Drama[]> {
    const normalizedLang = this.normalizeLang(lang);
    const cacheKey = `dramabox:vip:${normalizedLang}`;
    const cached = await cacheService.get<Drama[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await requestService.request('/drama-box/he001/theater', { 
      newChannelStyle: 1, 
      isNeedRank: 1, 
      pageNo: 1, 
      pageSize: 20, 
      index: 1, 
      channelId: 205 
    }, normalizedLang);
    const dramas = this.parseTheaterResponse(data, normalizedLang);
    await cacheService.set(cacheKey, dramas, 300);
    return dramas;
  }

  async getCategories(lang: string = 'in'): Promise<FeedCategory[]> {
    const normalizedLang = this.normalizeLang(lang);
    const cacheKey = `dramabox:categories:${normalizedLang}`;
    const cached = await cacheService.get<FeedCategory[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const [forYou, trending, newest] = await Promise.all([
      this.getForYou(normalizedLang, 1, this.PAGE_SIZE),
      this.getTrending(normalizedLang, 1, this.PAGE_SIZE),
      this.getNewest(normalizedLang, 1, this.PAGE_SIZE)
    ]);
    const allDramas = this.dedupeDramas([...forYou, ...trending, ...newest]);

    const categories = Array.from(
      new Set(
        allDramas.flatMap((drama) => drama.tags || []).filter(Boolean)
      )
    )
      .slice(0, 12)
      .map((name) => ({
        id: this.getCategoryId(name),
        name
      }));

    await cacheService.set(cacheKey, categories, 1800);
    return categories;
  }

  async getCategoryFeed(
    categoryId: string,
    lang: string = 'in',
    page: number = 1,
    limit: number = this.PAGE_SIZE
  ): Promise<{ items: Drama[]; has_more: boolean; page: number }> {
    const normalizedLang = this.normalizeLang(lang);
    const categories = await this.getCategories(normalizedLang);
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      return { items: [], has_more: false, page };
    }

    return this.getPagedUniqueFeed(
      async (sourcePage, sourceLimit) => {
        const sourceItems = await this.getForYou(normalizedLang, sourcePage, sourceLimit);
        return sourceItems.filter((drama) =>
          drama.tags.some((tag) => this.getCategoryId(tag) === categoryId)
        );
      },
      page,
      limit,
      `dramabox:${this.FEED_CACHE_VERSION}:category:${categoryId}:${normalizedLang}:${page}:${limit}`,
      normalizedLang,
      'category'
    );
  }

  async search(query: string, page: number = 1, lang: string = 'in'): Promise<Drama[]> {
    const normalizedLang = this.normalizeLang(lang);
    const data = await requestService.request('/drama-box/search/search', { 
      searchSource: "搜索按钮", 
      pageNo: page, 
      pageSize: 20, 
      from: "search_sug", 
      keyword: query 
    }, normalizedLang);
    const searchList = data?.data?.searchList || [];
    const dramas = searchList
      .filter((item: any) => item.type === 'book' || item.bookId || item.id)
      .map((b: any) => this.toDrama(b));
    void this.saveDramasToDb(dramas, normalizedLang);
    return dramas;
  }

  async getDetail(id: string, lang: string = 'in'): Promise<DramaDetail> {
    const normalizedLang = this.normalizeLang(lang);
    let cached: any = null;
    if (this.isDbReady()) {
      try {
        cached = await DramaModel.findOne({ id, lang: normalizedLang });
      } catch {
        cached = null;
      }
    }
    const hasCompleteMetadata = Boolean(
      cached?.title?.trim() &&
      cached?.cover?.trim() &&
      Number(cached?.chapters || 0) > 0
    );

    if (cached && hasCompleteMetadata && (Date.now() - cached.last_updated.getTime() < 86400000)) {
      return {
        id: cached.id,
        title: cached.title,
        description: cached.description,
        cover: cached.cover,
        total_episodes: cached.chapters,
        playCount: cached.playCount
      };
    }

    const data = await requestService.request('/drama-box/chapterv2/batch/load', { bookId: id }, normalizedLang);
    const b = data?.data;
    if (!b) throw new Error("Invalid response data");
    
    const detail = {
      id: String(b.bookId || id),
      title: String(b.bookName || ""),
      description: String(b.introduction || ""),
      cover: String(b.coverWap || ""),
      total_episodes: Number(b.chapterCount || 0),
      playCount: String(b.playCount || "0")
    };

    void this.saveDramasToDb([{
      ...detail,
      chapters: detail.total_episodes,
      playCount: "0",
      tags: []
    } as any], normalizedLang);

    return detail;
  }

  async getEpisodes(id: string, lang: string = 'in'): Promise<any[]> {
    const cacheKey = `dramabox:episodes:${id}:${lang}`;
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await requestService.request('/drama-box/chapterv2/detail', { bookId: id }, lang);
    const list = data?.data?.list || [];
    const episodes = list.map((m: any) => ({
      id: String(m.chapterId),
      index: Number(m.chapterIndex || 0) + 1,
      title: `Episode ${Number(m.chapterIndex || 0) + 1}`
    }));
    await cacheService.set(cacheKey, episodes, 1800);
    return episodes;
  }

  private async unlock(bookId: string, chapterId: string, index: number, lang: string): Promise<void> {
    await requestService.request('/drama-box/chapterv2/unlock', {
      autoPay: true,
      chapterId: chapterId,
      vip: true,
      unLockType: 1,
      bookId: bookId,
      confirmPay: true,
      interactionChapter: false,
      isRelease: 0,
      index: index,
      currencyPlaySource: "discover_205_503"
    }, lang);
  }

  async getStream(bookId: string, ep: number, lang: string = 'in', plan: string = 'free'): Promise<StreamData> {
    const targetIdx = ep - 1;
    const payload = {
      bookId: bookId,
      enterReaderChapterIndex: targetIdx,
      index: targetIdx,
      loadDirection: 1,
      startUpKey: crypto.randomUUID(),
      currencyPlaySource: "discover_205_503"
    };

    let resp = await requestService.request('/drama-box/chapterv2/batch/load', payload, lang);
    
    const hasEpisode = (data: any) => {
      return data?.chapterList?.some((ch: any) => ch.chapterIndex === targetIdx && ch.cdnList?.length > 0);
    };

    if (!hasEpisode(resp?.data)) {
      const eps = await this.getEpisodes(bookId, lang);
      const chapterId = eps.find(e => e.index === ep)?.id;
      if (chapterId) {
        await this.unlock(bookId, chapterId, targetIdx, lang);
        const retry = await requestService.request('/drama-box/chapterv2/batch/load', payload, lang);
        if (hasEpisode(retry?.data)) resp = retry;
      }
    }

    const streams: Stream[] = [];
    const ch = resp?.data?.chapterList?.find((c: any) => c.chapterIndex === targetIdx);
    
    if (ch?.cdnList?.[0]?.videoPathList) {
      ch.cdnList[0].videoPathList.forEach((vp: any) => {
        let quality = String(vp.quality);
        if (quality === "1080") quality = "1080p";
        if (quality === "720") quality = "720p";
        if (quality === "540") quality = "540p";
        streams.push({ quality, url: vp.videoPath, type: "mp4" });
      });
    }

    if (streams.length === 0) {
      const url = `https://regexd.com/base.php?ajax=1&bookId=${bookId}&lang=${lang}&episode=${ep}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      const result = await res.json() as any;
      const chapter = result?.chapter;
      if (chapter) {
        if (Array.isArray(chapter.qualities)) {
          chapter.qualities.forEach((q: any) => {
            let quality = String(q.quality);
            if (!quality.endsWith("p")) quality += "p";
            streams.push({ quality, url: q.videoPath, type: "mp4" });
          });
        } else if (chapter.mp4) {
          streams.push({ quality: "720p", url: chapter.mp4, type: "mp4" });
        }
      }
    }

    const streamData: StreamData = { id: bookId, streams };

    if (plan === 'free' && streamData) {
      return {
        ...streamData,
        streams: streamData.streams.filter(s => s.quality !== '1080p')
      };
    }

    return streamData;
  }
}

export const dramaboxService = new DramaboxService();
