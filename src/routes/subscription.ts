import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import Subscription from '../models/Subscription';
import User from '../models/User';
import { asyncHandler, validate } from '../lib/http';
import { subscriptionUpgradeSchema } from '../lib/schemas';

const router = Router();

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const subscription = await Subscription.findOne({ user_id: user._id }).lean();
  res.json(subscription);
}));

router.post('/upgrade', authMiddleware, asyncHandler(async (req, res) => {
  const { plan, plan_type } = validate(subscriptionUpgradeSchema, req.body);
  const selectedPlan = plan_type || plan!;
  const user = (req as any).user;

  let days = 30;
  if (selectedPlan === 'weekly') days = 7;
  if (selectedPlan === 'yearly') days = 365;

  const startedAt = new Date();
  const expiryDate = new Date(startedAt);
  expiryDate.setDate(expiryDate.getDate() + days);

  await User.findByIdAndUpdate(user._id, { plan: 'vip' });

  const subscription = await Subscription.findOneAndUpdate(
    { user_id: user._id },
    {
      plan: 'vip',
      status: 'active',
      started_at: startedAt,
      expires_at: expiryDate
    },
    { new: true, upsert: true }
  ).lean();

  res.json({
    success: true,
    message: `Successfully upgraded to VIP for ${days} days`,
    subscription
  });
}));

export default router;
