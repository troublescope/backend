import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import Payment from '../models/Payment';
import { asyncHandler, validate } from '../lib/http';
import { paymentCreateSchema } from '../lib/schemas';

const router = Router();

router.post('/create', authMiddleware, asyncHandler(async (req, res) => {
  const { amount, currency, provider, plan } = validate(paymentCreateSchema, req.body);
  const user = (req as any).user;

  const payment = await Payment.create({
    user_id: user._id,
    amount,
    currency: currency || 'USD',
    provider: provider || plan || 'manual'
  });

  res.status(201).json(payment);
}));

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const payments = await Payment.find({ user_id: user._id }).sort({ created_at: -1 }).lean();
  res.json(payments);
}));

export default router;
