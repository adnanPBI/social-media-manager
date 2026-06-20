import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@prisma/client';
import IORedis from 'ioredis';
import { getPlatformConfig } from '../../common/platform-config';

@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private redis: IORedis;
  private readonly prefix = 'ratelimit:publish';

  constructor(private config: ConfigService) {
    this.redis = new IORedis(this.config.get<string>('REDIS_URL') || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }

  async checkAndConsume(platform: Platform, accountId: string) {
    const platformConfig = getPlatformConfig(platform);
    const { windowMs, max } = platformConfig.rateLimit;
    const key = `${this.prefix}:${platform}:${accountId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const multi = this.redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zcard(key);
    const result = await multi.exec();
    const countBefore = Number(result?.[1]?.[1] || 0);

    if (countBefore >= max) {
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTs = oldest.length ? Number(oldest[1]) : now;
      const retryAfterMs = Math.max(0, oldestTs + windowMs - now);
      return { allowed: false, used: countBefore, remaining: 0, max, windowMs, retryAfterMs };
    }

    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    await this.redis.zadd(key, now, member);
    await this.redis.expire(key, Math.ceil(windowMs / 1000) + 60);

    return { allowed: true, used: countBefore + 1, remaining: max - countBefore - 1, max, windowMs, retryAfterMs: 0 };
  }

  async getUsage(platform: Platform, accountId: string) {
    const platformConfig = getPlatformConfig(platform);
    const { windowMs, max } = platformConfig.rateLimit;
    const key = `${this.prefix}:${platform}:${accountId}`;
    const windowStart = Date.now() - windowMs;
    await this.redis.zremrangebyscore(key, 0, windowStart);
    const used = await this.redis.zcard(key);
    return { used, max, remaining: Math.max(0, max - used), windowMs };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
