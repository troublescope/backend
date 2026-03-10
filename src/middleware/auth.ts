import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { userService } from '../services/user.service';
import { AppError } from '../lib/errors';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { user_id: string, telegram_id: number, username: string };
    const user = await userService.findById(decoded.user_id);

    if (!user) {
      return next(new AppError(401, 'User not found'));
    }

    // CHECK FOR SUBSCRIPTION EXPIRATION (Placeholder for Redis)
    /*
    if (user.plan === 'vip') {
       // Future Redis logic for subscription
    }
    */

    (req as any).user = user;
    next();
  } catch (error) {
    next(new AppError(401, 'Invalid or expired token'));
  }
};
