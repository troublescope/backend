import { Request, Response, NextFunction } from 'express';
import Blocked from '../models/Blocked';

export const blockedCheck = async (telegram_id: number) => {
  const blockedUser = await Blocked.findOne({ telegram_id });
  if (blockedUser) {
    throw new Error('User is blocked');
  }
};