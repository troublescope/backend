import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import WatchHistory from '../models/WatchHistory';
import SeriesLimit from '../models/SeriesLimit';
import { seriesService } from '../services/series.service';
import { episodeService } from '../services/episode.service';
import { dramaboxService } from '../services/dramabox.service';

const router = Router();

// Keep database logic as is
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { series_id, episode, progress } = req.body;
    const user = (req as any).user;
    const history = await WatchHistory.findOneAndUpdate(
      { user_id: user._id, series_id, episode },
      { progress, watched_at: new Date() },
      { upsert: true, new: true }
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const history = await WatchHistory.find({ user_id: user._id }).sort({ watched_at: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { series_id, episode, total_episodes } = req.body;
    const user = (req as any).user;
    if (user.plan === 'vip') return res.json({ allowed: true });
    let limit = await SeriesLimit.findOne({ series_id });
    if (!limit) {
      const free_limit = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
      limit = new SeriesLimit({ series_id, total_episodes, free_limit: Math.min(free_limit, total_episodes) });
      await limit.save();
    }
    if (episode <= limit.free_limit) return res.json({ allowed: true });
    res.json({ allowed: false, reason: 'vip_required', free_limit: limit.free_limit });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Individual endpoints to match Go structure
router.get('/foryou', async (req, res) => {
  try {
    const { lang, page, video } = req.query;
    const items = await dramaboxService.getForYou(lang as string || 'in', Number(page) || 1);
    
    // If video=true, fetch stream URL for the first 5 items
    if (video === 'true') {
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        try {
          const stream = await dramaboxService.getStream(items[i].id, 1, lang as string || 'in', 'free');
          items[i].episode_1_url = stream.streams[0]?.url;
        } catch (e) {
          // Skip if stream fetch fails
        }
      }
    }

    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const { lang, page } = req.query;
    const items = await dramaboxService.getTrending(lang as string || 'in', Number(page) || 1);
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/newest', async (req, res) => {
  try {
    const { lang, page } = req.query;
    const items = await dramaboxService.getNewest(lang as string || 'in', Number(page) || 1);
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reflect go-v2 API
router.get('/home', async (req, res) => {
  try {
    const { lang } = req.query;
    const data = await dramaboxService.getHomeData(lang as string || 'in');
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vip', async (req, res) => {
  try {
    const { lang } = req.query;
    const data = await dramaboxService.getVip(lang as string || 'in');
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, page, lang } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const data = await dramaboxService.search(q as string, Number(page) || 1, lang as string || 'in');
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;
    const data = await dramaboxService.getDetail(id, lang as string || 'in');
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/episodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;
    const data = await dramaboxService.getEpisodes(id, lang as string || 'in');
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stream/:id/:episode', authMiddleware, async (req, res) => {
  try {
    const { id, episode } = req.params;
    const { lang } = req.query;
    const user = (req as any).user;
    const epNum = Number(episode);

    // 1. Enforce series-specific limit for free users
    if (user.plan !== 'vip') {
      let limit = await SeriesLimit.findOne({ series_id: id });
      
      if (!limit) {
        // Fetch real total episodes to calculate probability-based limit
        const detail = await dramaboxService.getDetail(id, lang as string || 'in');
        const total = detail.total_episodes || 100;
        
        const factor = Math.random() * (0.25 - 0.10) + 0.10;
        let calculatedLimit = Math.floor(total * factor);
        const free_limit = Math.max(5, Math.min(30, calculatedLimit));

        limit = new SeriesLimit({ 
          series_id: id, 
          total_episodes: total,
          free_limit 
        });
        await limit.save();
      }

      if (epNum > limit.free_limit) {
        return res.status(403).json({
          allowed: false,
          reason: 'vip_required',
          message: `This series is limited to the first ${limit.free_limit} episodes for free users. Upgrade to VIP to watch all episodes.`,
          free_limit: limit.free_limit
        });
      }
    }

    // 2. Fetch stream with plan-based quality filtering
    const data = await dramaboxService.getStream(id, epNum, lang as string || 'in', user.plan);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
