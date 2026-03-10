import { cacheService } from '../services/cache.service';
import { AppError } from '../lib/errors';

export const blockedCheck = async (telegram_id: number) => {
  // Check Redis for blocked status
  const isBlocked = await cacheService.get(`blocked:${telegram_id}`);
  if (isBlocked) {
    throw new AppError(403, 'User is blocked');
  }
};
