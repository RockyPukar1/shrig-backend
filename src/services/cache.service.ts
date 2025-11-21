import { redisConfig } from "@/config/redis";
import { logger } from "@/utils/logger";

export class CacheService {
  private redis = redisConfig.getClient();
  private defaultTTL = parseInt(process.env.CACHE_TTL || "300"); // 5 minutes
  private keyPrefix = process.env.CACHE_PREFIX || "shrig:";

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await this.redis.get(this.getKey(key));
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      logger.error("Cache get error:", error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    ttl: number = this.defaultTTL
  ): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setEx(this.getKey(key), ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error("Cache set error:", error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(this.getKey(key));
      return true;
    } catch (error) {
      logger.error("Cache delete error:", error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}${pattern}`);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      return true;
    } catch (error) {
      logger.error("Cache invalidate pattern error:", error);
      return false;
    }
  }

  // Multi-level caching: Memory + Redis
  // The reason behind using this strategy is memory is faster than redis and redis is faster than database.
  private memoryCache = new Map<string, { data: any; expiry: number }>();

  async getMultiLevel<T>(key: string): Promise<T | null> {
    const memoryData = this.memoryCache.get(key);
    if (memoryData && memoryData.expiry > Date.now()) {
      return memoryData.data;
    }

    const redisData = await this.get<T>(key);
    if (redisData) {
      this.memoryCache.set(key, {
        data: redisData,
        expiry: Date.now() + 60000, // 1 minute in memory
      });
      return redisData;
    }
    return null;
  }

  async setMultiLevel(
    key: string,
    value: any,
    ttl: number = this.defaultTTL
  ): Promise<boolean> {
    this.memoryCache.set(key, {
      data: value,
      expiry: Date.now() + 60000, // 1 minute in memory
    });

    return await this.set(key, value, ttl);
  }
}

export const cacheService = new CacheService();
