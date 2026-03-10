import { Router } from 'express';
import { seriesService } from '../services/series.service';
import { episodeService } from '../services/episode.service';
import { authMiddleware } from '../middleware/auth';
import { cacheService } from '../services/cache.service';
import { asyncHandler, validate } from '../lib/http';
import { accessSchema, historySchema } from '../lib/schemas';
import { AppError } from '../lib/errors';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { userService } from '../services/user.service';

const router = Router();

const wantsVideoPreview = (value: unknown): boolean => {
  const normalized = String(value ?? '').toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

type StreamQualityMode = 'auto' | 'high' | 'med' | 'low';

const getStreamQualityMode = (value: unknown): StreamQualityMode => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'high' || normalized === 'low' || normalized === 'med') {
    return normalized;
  }
  return 'auto';
};

const getQualityRank = (quality: string): number => {
  const match = String(quality).match(/(\d{3,4})/);
  return match ? Number(match[1]) : 0;
};

const withEpisodeOneUrl = async (items: any[], lang: string, cap: number = 5) => {
  const list = Array.isArray(items) ? items : [];
  const limit = Math.min(cap, list.length);
  if (limit <= 0) {
    return list;
  }

  const enriched = [...list];
  const previewTargets = enriched.slice(0, limit);
  const streams = await Promise.allSettled(
    previewTargets.map((item) => episodeService.getStream(String(item.id), 1, lang, 'free'))
  );

  streams.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      return;
    }
    const url = result.value?.streams?.[0]?.url;
    if (url) {
      previewTargets[index].episode_1_url = url;
    }
  });

  return enriched;
};

// 1. Home Data
router.get('/home', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20));
  const includeVideo = wantsVideoPreview(req.query.video);
  const data = await seriesService.getHomeData(lang, page, limit);
  if (includeVideo) {
    data.forYou = await withEpisodeOneUrl(data.forYou, lang);
  }
  res.json(data);
}));

// 2. VIP Data
router.get('/vip', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const data = await seriesService.getVip(lang);
  res.json(data);
}));

router.get('/categories', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const categories = await seriesService.getCategories(lang);
  res.json(categories);
}));

router.get('/foryou', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit || req.query.pageSize) || 20));
  const includeVideo = wantsVideoPreview(req.query.video);
  const data = await seriesService.getForYouFeed(lang, page, limit);
  if (includeVideo) {
    data.items = await withEpisodeOneUrl(data.items, lang);
  }
  res.json(data);
}));

router.get('/trending', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit || req.query.pageSize) || 20));
  const data = await seriesService.getTrendingFeed(lang, page, limit);
  res.json(data);
}));

router.get('/newest', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit || req.query.pageSize) || 20));
  const data = await seriesService.getNewestFeed(lang, page, limit);
  res.json(data);
}));

router.get('/category/:id', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20));
  const data = await seriesService.getCategoryFeed(req.params.id, lang, page, limit);
  res.json(data);
}));

// 3. Search
router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const lang = (req.query.lang as string) || 'in';
  const page = Number(req.query.page) || 1;
  if (!q) {
    return res.json([]);
  }

  const data = await seriesService.searchSeries(q, page, lang);
  res.json(data);
}));

// 4. Detail
router.get('/detail/:id', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const detail = await seriesService.getSeriesDetail(req.params.id, lang);
  res.json(detail);
}));

// 5. Episodes
router.get('/episodes/:id', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const episodes = await episodeService.getEpisodeList(req.params.id, lang);
  res.json(episodes);
}));

const resolvePlanFromToken = async (req: any): Promise<string> => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return 'free';
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { user_id: string };
    const user = await userService.findById(decoded.user_id);
    return user?.plan || 'free';
  } catch {
    return 'free';
  }
};

const isStreamReachable = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok || response.status === 206;
  } catch {
    return false;
  }
};

// 6. Stream URL
router.get('/stream/:id/:episode', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'in';
  const qualityMode = getStreamQualityMode(req.query.quality);
  const episode = Number(req.params.episode);
  if (!Number.isInteger(episode) || episode < 1) {
    throw new AppError(400, 'Invalid episode');
  }

  const plan = await resolvePlanFromToken(req);
  const pickReachable = async (streams: Array<{ url: string; quality?: string }>) => {
    const sorted = [...streams].sort((a, b) => getQualityRank(b.quality || '') - getQualityRank(a.quality || ''));
    const prioritized = (() => {
      if (qualityMode === 'high') {
        return sorted;
      }
      if (qualityMode === 'med') {
        return [...sorted].sort(
          (a, b) => Math.abs(getQualityRank(a.quality || '') - 720) - Math.abs(getQualityRank(b.quality || '') - 720)
        );
      }
      if (qualityMode === 'low') {
        return [...sorted].reverse();
      }
      return sorted;
    })();

    for (const stream of prioritized.slice(0, 3)) {
      if (await isStreamReachable(stream.url)) {
        return stream;
      }
    }
    return prioritized[0];
  };

  let result = await episodeService.getStream(req.params.id, episode, lang, plan);
  let bestStream = result?.streams?.length ? await pickReachable(result.streams) : null;

  if (!bestStream) {
    // Retry once with a fresh upstream fetch path when the first attempt has no usable stream.
    result = await episodeService.getStream(req.params.id, episode, lang, plan);
    bestStream = result?.streams?.length ? await pickReachable(result.streams) : null;
  }

  if (!bestStream) {
    throw new AppError(404, 'Stream not found');
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ url: bestStream.url });
}));

// 7. Check Access (Always allow for now in Redis mode)
router.post('/check', authMiddleware, async (req, res) => {
  validate(accessSchema, req.body);
  res.json({ accessible: true });
});

// 8. Save Progress (Redis History)
router.post('/save', authMiddleware, asyncHandler(async (req, res) => {
  const { series_id, episode, progress } = validate(historySchema, req.body);
  const user = (req as any).user;

  const historyKey = `history:${user._id}`;
  const history = await cacheService.get<any[]>(historyKey) || [];
  const filtered = history.filter((item) => item.series_id !== series_id);
  filtered.unshift({
    series_id,
    episode,
    progress,
    watched_at: new Date().toISOString()
  });

  await cacheService.set(historyKey, filtered.slice(0, 20), 30 * 86400);
  res.json({ success: true });
}));

// 9. History
router.get('/history', authMiddleware, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const historyKey = `history:${user._id}`;
  const history = await cacheService.get<any[]>(historyKey) || [];
  res.json(history);
}));

export default router;
