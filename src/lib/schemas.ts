import { z } from 'zod';

export const telegramAuthSchema = z.object({
  initData: z.string().trim().min(1).optional(),
  initDataRaw: z.string().trim().min(1).optional()
}).refine((value) => Boolean(value.initData || value.initDataRaw), {
  message: 'initData is required',
  path: ['initData']
});

export const historySchema = z.object({
  series_id: z.string().trim().min(1),
  episode: z.coerce.number().int().positive(),
  progress: z.coerce.number().min(0)
});

export const accessSchema = z.object({
  series_id: z.string().trim().min(1),
  episode: z.coerce.number().int().positive()
});

export const favoriteSchema = z.object({
  series_id: z.string().trim().min(1).optional(),
  content_id: z.string().trim().min(1).optional()
}).refine((value) => Boolean(value.series_id || value.content_id), {
  message: 'series_id or content_id is required',
  path: ['series_id']
});

export const subscriptionUpgradeSchema = z.object({
  plan: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  plan_type: z.enum(['weekly', 'monthly', 'yearly']).optional()
}).refine((value) => Boolean(value.plan || value.plan_type), {
  message: 'plan_type is required',
  path: ['plan_type']
});

export const paymentCreateSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().trim().min(3).max(8).optional(),
  provider: z.string().trim().min(1).optional(),
  plan: z.string().trim().min(1).optional()
});
