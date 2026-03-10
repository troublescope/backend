import { config } from '../config/env';

class CacheService {
  private redisUrl = config.upstashRedisRestUrl;
  private redisToken = config.upstashRedisRestToken;
  private inMemoryMap = new Map<string, { value: any, expiry: number }>();
  private lastCleanup = 0;

  private cleanupExpiredEntries() {
    const now = Date.now();
    if (now - this.lastCleanup < 60_000) {
      return;
    }

    this.lastCleanup = now;
    for (const [key, value] of this.inMemoryMap.entries()) {
      if (value.expiry <= now) {
        this.inMemoryMap.delete(key);
      }
    }
  }

  private async fetchRedis(command: string[]): Promise<any> {
    if (!this.redisUrl || !this.redisToken) return null;
    
    try {
      const response = await fetch(`${this.redisUrl}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.redisToken}` },
        body: JSON.stringify(command)
      });
      const data = await response.json() as any;
      return data.result;
    } catch (err) {
      console.error('Redis error:', err);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600) {
    this.cleanupExpiredEntries();

    // Try Redis
    if (this.redisUrl) {
      await this.fetchRedis(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)]);
    }
    
    // Always fallback to in-memory
    this.inMemoryMap.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
  }

  async get<T>(key: string): Promise<T | null> {
    this.cleanupExpiredEntries();

    // Check in-memory first (fastest)
    const local = this.inMemoryMap.get(key);
    if (local && Date.now() < local.expiry) return local.value as T;
    if (local) this.inMemoryMap.delete(key);

    // Try Redis
    if (this.redisUrl) {
      const result = await this.fetchRedis(['GET', key]);
      if (result) {
        try {
          const parsed = JSON.parse(result);
          // Sync back to memory
          this.inMemoryMap.set(key, { value: parsed, expiry: Date.now() + 300000 }); // 5 min local sync
          return parsed as T;
        } catch {
          return result as T;
        }
      }
    }

    return null;
  }

  async incr(key: string, ttlSeconds: number = 86400): Promise<number> {
    this.cleanupExpiredEntries();

    if (this.redisUrl) {
      const val = await this.fetchRedis(['INCR', key]);
      if (val === 1) await this.fetchRedis(['EXPIRE', key, String(ttlSeconds)]);
      return Number(val);
    }
    
    // In-memory counter
    const local = this.inMemoryMap.get(key);
    const newVal = (local?.value || 0) + 1;
    this.inMemoryMap.set(key, { value: newVal, expiry: local?.expiry || Date.now() + ttlSeconds * 1000 });
    return newVal;
  }
}

export const cacheService = new CacheService();
