import express from 'express';
import cors from 'cors';
import { connectDB } from './db/mongo';
import { handleTelegramUpdate } from './bot/bot';
import { apiRateLimiter } from './middleware/ratelimit';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import favoriteRoutes from './routes/favorites';
import watchRoutes from './routes/watch';
import subscriptionRoutes from './routes/subscription';
import paymentRoutes from './routes/payments';
import configRoutes from './routes/config';

const app = express();

app.use(cors());

app.post('/webhook', express.json(), async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.status(200).send('OK');
  }
});

app.use(express.json());
app.use(apiRateLimiter);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/watch', watchRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/payments', paymentRoutes);
app.use('/config', configRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', region: 'sin1' });
});

app.get('/', (req, res) => {
  res.json({ status: 'running' });
});

connectDB();

export default app;
