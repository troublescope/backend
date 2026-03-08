import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import Subscription from '../models/Subscription';
import WatchHistory from '../models/WatchHistory';
import Drama from '../models/Drama';
import Favorite from '../models/Favorite';

const router = Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const subscription = await Subscription.findOne({ user_id: user._id });

    res.json({ user, subscription });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;

    // Total episodes watched
    const totalEpisodes = await WatchHistory.countDocuments({ user_id: user._id });

    // Total unique series watched
    const distinctSeries = await WatchHistory.distinct('series_id', { user_id: user._id });
    const totalSeries = distinctSeries.length;

    // Total favorites
    const totalFavorites = await Favorite.countDocuments({ user_id: user._id });

    // Recently watched: Latest episode for each unique series (Continue Watching)
    const recentHistory = await WatchHistory.aggregate([
      { $match: { user_id: user._id } },
      { $sort: { watched_at: -1 } },
      { 
        $group: {
          _id: "$series_id",
          episode: { $first: "$episode" },
          progress: { $first: "$progress" },
          watched_at: { $first: "$watched_at" }
        }
      },
      { $sort: { watched_at: -1 } },
      { $limit: 10 }
    ]);

    // Fetch drama metadata for recent series
    const recentWithMetadata = await Promise.all(recentHistory.map(async (h) => {
      const drama = await Drama.findOne({ id: h._id });
      return {
        series_id: h._id,
        episode: h.episode,
        progress: h.progress,
        watched_at: h.watched_at,
        title: drama?.title || 'Unknown Drama',
        cover: drama?.cover || ''
      };
    }));

    res.json({
      stats: {
        total_episodes: totalEpisodes,
        total_series: totalSeries,
        total_favorites: totalFavorites,
        plan: user.plan
      },
      recent: recentWithMetadata
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;