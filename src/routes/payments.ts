import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import Payment from '../models/Payment';

const router = Router();

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { amount, currency, provider } = req.body;
    const user = (req as any).user;

    const payment = new Payment({
      user_id: user._id,
      amount,
      currency: currency || 'USD',
      provider
    });

    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const payments = await Payment.find({ user_id: user._id }).sort({ created_at: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;