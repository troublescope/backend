import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../lib/http';

const router = Router();

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const subscription = {
    plan: user.plan || 'free',
    status: 'active',
    started_at: user.created_at,
  };

  res.json({ user, subscription });
}));

export default router;
