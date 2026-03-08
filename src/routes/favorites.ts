import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import Favorite from '../models/Favorite';
import Drama from '../models/Drama';

const router = Router();

// Toggle favorite
router.post('/toggle', authMiddleware, async (req, res) => {
  try {
    const { series_id } = req.body;
    const user = (req as any).user;

    const existing = await Favorite.findOne({ user_id: user._id, content_id: series_id });

    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      return res.json({ favorited: false });
    }

    const favorite = new Favorite({
      user_id: user._id,
      content_id: series_id
    });

    await favorite.save();
    res.status(201).json({ favorited: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get favorites with metadata
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const favorites = await Favorite.find({ user_id: user._id }).sort({ created_at: -1 });

    const favoritesWithMetadata = await Promise.all(favorites.map(async (f) => {
      const drama = await Drama.findOne({ id: f.content_id });
      return {
        series_id: f.content_id,
        created_at: f.created_at,
        title: drama?.title || 'Unknown Drama',
        cover: drama?.cover || '',
        chapters: drama?.chapters || 0
      };
    }));

    res.json(favoritesWithMetadata);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Legacy routes for compatibility if needed
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content_id } = req.body;
    const user = (req as any).user;
    const favorite = new Favorite({ user_id: user._id, content_id });
    await favorite.save();
    res.status(201).json(favorite);
  } catch (error: any) {
    if (error.code === 11000) return res.status(400).json({ error: 'Already in favorites' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
