import { Router } from 'express';
import { validate } from '@tma.js/init-data-node';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Subscription from '../models/Subscription';
import { config } from '../config/env';
import { blockedCheck } from '../middleware/blocked';
import { authRateLimiter } from '../middleware/ratelimit';

const router = Router();

router.post('/telegram', authRateLimiter, async (req, res) => {
  const { initDataRaw } = req.body;

  if (!initDataRaw) {
    return res.status(400).json({ error: 'initDataRaw is required' });
  }

  try {
    validate(initDataRaw, config.botToken);
    
    const urlParams = new URLSearchParams(initDataRaw);
    const userStr = urlParams.get('user');
    
    if (!userStr) {
      return res.status(400).json({ error: 'User data not found in initData' });
    }

    const tgUser = JSON.parse(userStr);
    
    await blockedCheck(tgUser.id);

    let user = await User.findOne({ telegram_id: tgUser.id });

    if (!user) {
      user = new User({
        telegram_id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        photo_url: tgUser.photo_url,
      });
      await user.save();
      
      const sub = new Subscription({
        user_id: user._id,
      });
      await sub.save();
    } else {
      user.last_login = new Date();
      await user.save();
    }

    const token = jwt.sign(
      { 
        user_id: user._id,
        telegram_id: user.telegram_id,
        plan: user.plan
      }, 
      config.jwtSecret, 
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (error: any) {
    if (error.message === 'User is blocked') {
      return res.status(403).json({ error: 'User is blocked' });
    }
    res.status(401).json({ error: 'Invalid authentication data' });
  }
});

export default router;