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
}

export interface DramaDetail {
  id: string;
  title: string;
  description: string;
  cover: string;
  total_episodes: number;
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

export class DramaboxService {
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

  private async saveDramaToDb(drama: Drama) {
    try {
      await DramaModel.findOneAndUpdate(
        { id: drama.id },
        { ...drama, last_updated: new Date() },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save drama to DB:', err);
    }
  }

  async getHomeData(lang: string = 'in'): Promise<{ forYou: Drama[], trending: Drama[], newest: Drama[] }> {
    const [forYouData, trendingData, newestData] = await Promise.all([
      requestService.request('/drama-box/he001/theater', { homePageStyle: 0, isNeedRank: 1, isNeedNewChannel: 1, type: 0, pageNo: 1, pageSize: 20 }, lang),
      requestService.request('/drama-box/he001/theater', { newChannelStyle: 1, isNeedRank: 1, pageNo: 1, pageSize: 20, index: 0, channelId: 92 }, lang),
      requestService.request('/drama-box/he001/theater', { homePageStyle: 0, isNeedRank: 1, isNeedNewChannel: 1, type: 0, pageNo: 1, pageSize: 20 }, lang)
    ]);

    const parse = (data: any) => {
      const list: Drama[] = [];
      data?.data?.columnVoList?.forEach((col: any) => col.bookList?.forEach((b: any) => {
        const drama = this.toDrama(b);
        list.push(drama);
        this.saveDramaToDb(drama);
      }));
      data?.data?.bannerList?.forEach((b: any) => {
        const drama = this.toDrama(b);
        list.push(drama);
        this.saveDramaToDb(drama);
      });
      return list;
    };

    return {
      forYou: parse(forYouData),
      trending: parse(trendingData),
      newest: parse(newestData)
    };
  }

  async getVip(lang: string = 'in'): Promise<Drama[]> {
    const data = await requestService.request('/drama-box/he001/theater', { newChannelStyle: 1, isNeedRank: 1, pageNo: 1, pageSize: 20, index: 1, channelId: 205 }, lang);
    const list: Drama[] = [];
    data?.data?.columnVoList?.forEach((col: any) => col.bookList?.forEach((b: any) => {
      const drama = this.toDrama(b);
      list.push(drama);
      this.saveDramaToDb(drama);
    }));
    return list;
  }

  async search(query: string, page: number = 1, lang: string = 'in'): Promise<Drama[]> {
    const data = await requestService.request('/drama-box/search/search', { searchSource: "搜索按钮", pageNo: page, pageSize: 20, from: "search_sug", keyword: query }, lang);
    const searchList = data?.data?.searchList || [];
    const results = searchList
      .filter((item: any) => item.type === 'book' || item.bookId || item.id)
      .map((b: any) => {
        const drama = this.toDrama(b);
        this.saveDramaToDb(drama);
        return drama;
      });
    return results;
  }

  async getDetail(id: string, lang: string = 'in'): Promise<DramaDetail> {
    // Check DB first
    const cached = await DramaModel.findOne({ id });
    if (cached && (Date.now() - cached.last_updated.getTime() < 86400000)) { // 24h freshness
      return {
        id: cached.id,
        title: cached.title,
        description: cached.description,
        cover: cached.cover,
        total_episodes: cached.chapters
      };
    }

    const data = await requestService.request('/drama-box/chapterv2/batch/load', { bookId: id }, lang);
    const b = data?.data;
    if (!b) throw new Error("Invalid response data");
    
    const detail = {
      id: String(b.bookId || id),
      title: String(b.bookName || ""),
      description: String(b.introduction || ""),
      cover: String(b.coverWap || ""),
      total_episodes: Number(b.chapterCount || 0)
    };

    // Update DB record
    this.saveDramaToDb({
      ...detail,
      chapters: detail.total_episodes,
      playCount: "0",
      tags: []
    } as any);

    return detail;
  }

  async getEpisodes(id: string, lang: string = 'in'): Promise<any[]> {
    const data = await requestService.request('/drama-box/chapterv2/detail', { bookId: id }, lang);
    const list = data?.data?.list || [];
    return list.map((m: any) => ({
      id: String(m.chapterId),
      index: Number(m.chapterIndex || 0) + 1,
      title: `Episode ${Number(m.chapterIndex || 0) + 1}`
    }));
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
    const cacheKey = `stream_${bookId}_${ep}_${lang}`;
    let streamData = await cacheService.get<StreamData>(cacheKey);

    if (!streamData || streamData.streams.length === 0) {
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

      streamData = { id: bookId, streams };
      if (streams.length > 0) {
        await cacheService.set(cacheKey, streamData, 3600);
      }
    }

    // FILTER QUALITY FOR FREE USERS
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
