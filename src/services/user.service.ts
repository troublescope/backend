import { cacheService } from './cache.service';
import { config } from '../config/env';

export interface IUserRedis {
  _id: string; // Keep _id to avoid changing other routes
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  is_premium: boolean;
  is_owner?: boolean;
  plan: 'free' | 'vip';
  created_at: string;
  last_login: string;
}

class UserService {
  private USER_KEY_PREFIX = 'user:tg:';
  private USER_ID_KEY_PREFIX = 'user:id:';

  private applyOwnerFlags(user: IUserRedis): IUserRedis {
    if (user.telegram_id === config.ownerId) {
      user.is_owner = true;
      user.is_premium = true;
      user.plan = 'vip';
    }

    return user;
  }

  async findByTelegramId(tgId: number): Promise<IUserRedis | null> {
    const key = `${this.USER_KEY_PREFIX}${tgId}`;
    const user = await cacheService.get<IUserRedis>(key);
    return user ? this.applyOwnerFlags(user) : null;
  }

  async findById(id: string): Promise<IUserRedis | null> {
    const key = `${this.USER_ID_KEY_PREFIX}${id}`;
    const user = await cacheService.get<IUserRedis>(key);
    return user ? this.applyOwnerFlags(user) : null;
  }

  async save(user: IUserRedis): Promise<IUserRedis> {
    this.applyOwnerFlags(user);
    const tgKey = `${this.USER_KEY_PREFIX}${user.telegram_id}`;
    const idKey = `${this.USER_ID_KEY_PREFIX}${user._id}`;
    
    // TTL of 30 days for user data in Redis if not active
    const TTL = 30 * 24 * 60 * 60; 
    
    await cacheService.set(tgKey, user, TTL);
    await cacheService.set(idKey, user, TTL);
    
    return user;
  }

  async create(tgUser: any): Promise<IUserRedis> {
    const newUser: IUserRedis = {
      _id: `u_${Date.now()}_${tgUser.id}`,
      telegram_id: tgUser.id,
      username: tgUser.username,
      first_name: tgUser.firstName,
      last_name: tgUser.lastName,
      photo_url: tgUser.photoUrl,
      is_premium: !!tgUser.isPremium,
      is_owner: tgUser.id === config.ownerId,
      plan: 'free',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };
    
    return await this.save(this.applyOwnerFlags(newUser));
  }

  async updateLastLogin(user: IUserRedis): Promise<IUserRedis> {
    user.last_login = new Date().toISOString();
    return await this.save(this.applyOwnerFlags(user));
  }
}

export const userService = new UserService();
