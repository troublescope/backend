import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { connectDB } from './db/mongo';
import { handleTelegramUpdate } from './bot/bot';
import { apiRateLimiter } from './middleware/ratelimit';
import { asyncHandler } from './lib/http';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import favoriteRoutes from './routes/favorites';
import watchRoutes from './routes/watch';
import subscriptionRoutes from './routes/subscription';
import paymentRoutes from './routes/payments';
import configRoutes from './routes/config';

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

void connectDB();

// Swagger Documentation
const swaggerOptions = {
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.js'
  ]
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

app.post('/webhook', asyncHandler(async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
  } catch (err) {
    console.error('Telegram webhook error:', err);
  }

  res.status(200).send('OK');
}));

app.use(apiRateLimiter);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/watch', watchRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/payments', paymentRoutes);
app.use('/config', configRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    region: process.env.VERCEL_REGION || 'unknown',
    node_env: process.env.NODE_ENV
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'running' });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
