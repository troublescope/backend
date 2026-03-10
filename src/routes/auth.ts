import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { blockedCheck } from '../middleware/blocked';
import { authRateLimiter } from '../middleware/ratelimit';
import { cacheService } from '../services/cache.service';
import { userService } from '../services/user.service';
import { verifyTelegramWebAppData } from '../lib/auth';
import { AppError } from '../lib/errors';
import { asyncHandler, validate } from '../lib/http';
import { telegramAuthSchema } from '../lib/schemas';

const router = Router();

router.post('/telegram', authRateLimiter, asyncHandler(async (req, res) => {
  const { initData, initDataRaw } = validate(telegramAuthSchema, req.body);
  const rawData = initData || initDataRaw!;

  let validationResult;
  try {
    validationResult = verifyTelegramWebAppData(rawData, config.botToken);
  } catch (error) {
    throw new AppError(401, 'Invalid authentication format', (error as Error).message);
  }

  if (!validationResult.isValid) {
    throw new AppError(401, 'Invalid authentication signature');
  }

  const parsedData = validationResult.data;
  const tgUser = parsedData.user as Record<string, unknown> | undefined;

  if (!tgUser || typeof tgUser.id !== 'number') {
    throw new AppError(400, 'User data not found in initData');
  }

  const authDateNum = Number(parsedData.auth_date);
  if (!authDateNum || Number.isNaN(authDateNum)) {
    throw new AppError(400, 'auth_date is missing or invalid');
  }

  const authDate = new Date(authDateNum * 1000);
  if (Date.now() - authDate.getTime() > 60 * 60 * 1000) {
    throw new AppError(401, 'Authentication data expired (older than 1 hour)');
  }

  await blockedCheck(tgUser.id);

  const cacheKey = `auth_verify_db_${tgUser.id}`;
  const recentlyVerified = await cacheService.get<string>(cacheKey);
  let user = await userService.findByTelegramId(tgUser.id);

  if (!user) {
    user = await userService.create({
      id: tgUser.id,
      username: typeof tgUser.username === 'string' ? tgUser.username : undefined,
      firstName: typeof tgUser.first_name === 'string' ? tgUser.first_name : undefined,
      lastName: typeof tgUser.last_name === 'string' ? tgUser.last_name : undefined,
      photoUrl: typeof tgUser.photo_url === 'string' ? tgUser.photo_url : undefined,
      isPremium: Boolean(tgUser.is_premium),
    });
    await cacheService.set(cacheKey, 'true', 60);
  } else if (!recentlyVerified) {
    user.username = (typeof tgUser.username === 'string' ? tgUser.username : user.username) || user.username;
    user.first_name = (typeof tgUser.first_name === 'string' ? tgUser.first_name : user.first_name) || user.first_name;
    user.last_name = (typeof tgUser.last_name === 'string' ? tgUser.last_name : user.last_name) || user.last_name;
    user.photo_url = (typeof tgUser.photo_url === 'string' ? tgUser.photo_url : user.photo_url) || user.photo_url;
    user.is_premium = user.telegram_id === config.ownerId
      ? true
      : typeof tgUser.is_premium === 'boolean'
        ? tgUser.is_premium
        : user.is_premium;
    user = await userService.updateLastLogin(user);
    await cacheService.set(cacheKey, 'true', 60);
  }

  const token = jwt.sign(
    {
      user_id: user._id,
      telegram_id: user.telegram_id,
      username: user.username
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.json({ token, user });
}));

export default router;
