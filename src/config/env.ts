import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port: string | number;
  mongoUri: string;
  botToken: string;
  ownerId: number;
  jwtSecret: string;
  miniAppUrl: string;
  upstashRedisRestUrl: string;
  upstashRedisRestToken: string;
}

export const config: Config = {
  port: process.env.PORT?.trim() || 3001,
  mongoUri: process.env.MONGODB_URI?.trim() || 'mongodb://localhost:27017/tmaback',
  botToken: process.env.BOT_TOKEN?.trim() || '',
  ownerId: Number(process.env.OWNER_ID?.trim() || '7492470603'),
  jwtSecret: process.env.JWT_SECRET?.trim() || 'fallback_secret',
  miniAppUrl: process.env.MINI_APP_URL?.trim() || '',
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || ''
};
