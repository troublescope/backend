import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import User from '../models/User';
import Subscription from '../models/Subscription';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { user_id: string, telegram_id: number, plan: string };
    const user = await User.findById(decoded.user_id);

    if (!user) {
      throw new Error();
    }

    // CHECK FOR SUBSCRIPTION EXPIRATION
    if (user.plan === 'vip') {
      const sub = await Subscription.findOne({ user_id: user._id });
      if (sub && sub.expires_at && new Date() > sub.expires_at) {
        // Plan expired
        user.plan = 'free';
        await user.save();
        await Subscription.findOneAndUpdate({ user_id: user._id }, { status: 'expired' });
      }
    }

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};