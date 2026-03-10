import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import Favorite from '../models/Favorite';
import Drama from '../models/Drama';
import { seriesService } from '../services/series.service';
import { asyncHandler, validate } from '../lib/http';
import { favoriteSchema } from '../lib/schemas';

const router = Router();

// Toggle favorite
router.post('/toggle', authMiddleware, asyncHandler(async (req, res) => {
  const { series_id, content_id } = validate(favoriteSchema, req.body);
  const targetId = series_id || content_id!;
  const user = (req as any).user;

  const existing = await Favorite.findOne({ user_id: user._id, content_id: targetId }).lean();
  if (existing) {
    await Favorite.deleteOne({ _id: existing._id });
    return res.json({ favorited: false });
  }

  await Favorite.create({
    user_id: user._id,
    content_id: targetId
  });

  res.status(201).json({ favorited: true });
}));

// Get favorites with metadata
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const langParam = (req.query.lang as string) || 'in';
  const lang = langParam === 'id' ? 'in' : langParam;
  const favorites = await Favorite.find({ user_id: user._id })
    .sort({ created_at: -1 })
    .select({ content_id: 1, created_at: 1 })
    .lean();

  const dramaIds = favorites.map((favorite) => favorite.content_id);
  const dramas = dramaIds.length
    ? await Drama.find({ id: { $in: dramaIds }, lang })
      .select({ id: 1, title: 1, cover: 1, chapters: 1 })
      .lean()
    : [];

  const hasCompleteMetadata = (drama: { title?: string; cover?: string; chapters?: number } | undefined) =>
    Boolean(drama?.title?.trim() && drama?.cover?.trim() && Number(drama?.chapters || 0) > 0);

  const dramaMap = new Map(dramas.map((drama) => [drama.id, drama]));

  const missingMetadataIds = dramaIds.filter((id) => !hasCompleteMetadata(dramaMap.get(id)));
  if (missingMetadataIds.length > 0) {
    await Promise.all(
      missingMetadataIds.map(async (id) => {
        try {
          const detail = await seriesService.getSeriesDetail(id, lang);
          dramaMap.set(id, {
            id: detail.id,
            title: detail.title,
            cover: detail.cover,
            chapters: detail.total_episodes,
          } as any);
        } catch {
          // Keep fallback "Unknown Drama" payload if origin fetch fails.
        }
      })
    );
  }

  const favoritesWithMetadata = favorites.map((favorite) => {
    const drama = dramaMap.get(favorite.content_id);
    return {
      series_id: favorite.content_id,
      created_at: favorite.created_at,
      title: drama?.title || 'Unknown Drama',
      cover: drama?.cover || '',
      chapters: drama?.chapters || 0
    };
  });

  res.json(favoritesWithMetadata);
}));

// Legacy routes for compatibility if needed
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const { series_id, content_id } = validate(favoriteSchema, req.body);
  const user = (req as any).user;

  try {
    const favorite = await Favorite.create({
      user_id: user._id,
      content_id: content_id || series_id!
    });
    res.status(201).json(favorite);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Already in favorites' });
    }
    throw error;
  }
}));

export default router;
