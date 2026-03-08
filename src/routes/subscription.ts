import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import Subscription from '../models/Subscription';
import User from '../models/User';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const subscription = await Subscription.findOne({ user_id: user._id });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/upgrade', authMiddleware, async (req, res) => {
  try {
    const { plan_type } = req.body; // 'weekly', 'monthly', 'yearly'
    const user = (req as any).user;
    
    let days = 30;
    if (plan_type === 'weekly') days = 7;
    if (plan_type === 'yearly') days = 365;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    // Update User Plan
    await User.findByIdAndUpdate(user._id, { plan: 'vip' });
    
    // Update or Create Subscription
    const subscription = await Subscription.findOneAndUpdate(
      { user_id: user._id },
      { 
        plan: 'vip',
        status: 'active',
        started_at: new Date(),
        expires_at: expiryDate
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: `Successfully upgraded to VIP for ${days} days`,
      subscription
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;