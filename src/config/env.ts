import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port: string | number;
  mongoUri: string;
  botToken: string;
  jwtSecret: string;
  miniAppUrl: string;
  upstashRedisRestUrl: string;
  upstashRedisRestToken: string;
}

export const config: Config = {
  port: process.env.PORT?.trim() || 3000,
  mongoUri: process.env.MONGODB_URI?.trim() || 'mongodb://localhost:27017/tmaback',
  botToken: process.env.BOT_TOKEN?.trim() || '',
  jwtSecret: process.env.JWT_SECRET?.trim() || 'fallback_secret',
  miniAppUrl: process.env.MINI_APP_URL?.trim() || 'https://dramabox-tau-eosin.vercel.app',
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || ''
};
