import 'reflect-metadata';
import { PrismaClient, PublishStatus, ScheduleStatus, Platform } from '@prisma/client';
import { Queue, Worker, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { ANALYTICS_QUEUE, AnalyticsJobData, PUBLISH_QUEUE, PublishJobData } from './common/queues';
import { getPlatformConfig } from './common/platform-config';
import { getAdapter } from './modules/platforms/adapters/adapter.factory';

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const analyticsQueue = new Queue<AnalyticsJobData>(ANALYTICS_QUEUE, { connection: connection as any });
const publishQueue = new Queue<PublishJobData>(PUBLISH_QUEUE, { connection: connection as any });
const cronQueue = new Queue('CRON_QUEUE', { connection: connection as any });
const ANALYTICS_SYNC_INTERVAL_MS = Number(process.env.ANALYTICS_SYNC_INTERVAL_MS || 5 * 60 * 1000);
const FIRST_ANALYTICS_DELAY_MS = Number(process.env.FIRST_ANALYTICS_DELAY_MS || 60 * 1000);
const RATE_PREFIX = 'ratelimit:publish';

connection.defineCommand('consumeQuota', {
  numberOfKeys: 1,
  lua: `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local windowStart = now - tonumber(ARGV[2])
    local max = tonumber(ARGV[3])
    local member = ARGV[4]
    local windowSeconds = math.ceil(tonumber(ARGV[2]) / 1000)

    redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
    local used = tonumber(redis.call('ZCARD', key) or "0")

    if used >= max then
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local oldestTs = (oldest and oldest[2]) and tonumber(oldest[2]) or now
      return { 0, used, oldestTs }
    else
      redis.call('ZADD', key, now, member)
      redis.call('EXPIRE', key, windowSeconds + 60)
      return { 1, used + 1, 0 }
    end
  `
});

async function checkAndConsume(platform: Platform, accountId: string) {
  const cfg = getPlatformConfig(platform);
  const { windowMs, max } = cfg.rateLimit;
  const key = `${RATE_PREFIX}:${platform}:${accountId}`;
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  
  const result = await (connection as any).consumeQuota(key, now, windowMs, max, member);
  const allowed = result[0] === 1;
  const used = result[1];
  const oldestTs = result[2];

  if (!allowed) {
    return { allowed: false, used, max, retryAfterMs: Math.max(0, oldestTs + windowMs - now) };
  }

  return { allowed: true, used, max, retryAfterMs: 0 };
}

new Worker<PublishJobData>(
  PUBLISH_QUEUE,
  async (job) => {
    const { scheduledPostId } = job.data;
    const scheduled = await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      include: {
        contentItem: true,
        variants: { include: { socialAccount: true } },
      },
    });

    if (!scheduled) throw new Error(`Scheduled post ${scheduledPostId} not found`);
    if (scheduled.status === ScheduleStatus.CANCELLED) return { skipped: 'cancelled' };

    await prisma.scheduledPost.update({ where: { id: scheduled.id }, data: { status: 'PUBLISHING' } });

    let success = 0;
    let failure = 0;
    let rateDelayed = 0;

    for (const variant of scheduled.variants) {
      if (variant.publishStatus === PublishStatus.PUBLISHED) {
        success++;
        continue;
      }

      try {
        await prisma.platformPostVariant.update({
          where: { id: variant.id },
          data: { publishStatus: 'PUBLISHING', jobStatus: 'PROCESSING', attemptedAt: new Date(), errorMessage: null },
        });

        const quota = await checkAndConsume(variant.platform, variant.socialAccountId);
        await prisma.socialAccount.update({
          where: { id: variant.socialAccountId },
          data: { lastQuotaUsed: quota.used, lastQuotaMax: quota.max, lastSyncAt: new Date() },
        });

        if (!quota.allowed) {
          const delay = quota.retryAfterMs + 5000;
          const nextAttempt = new Date(Date.now() + delay);
          await prisma.platformPostVariant.update({
            where: { id: variant.id },
            data: {
              publishStatus: 'RATE_DELAYED',
              jobStatus: 'RATE_DELAYED',
              rateDelayedUntil: nextAttempt,
              errorMessage: 'Rate limit reached. Publish job re-delayed automatically.',
            },
          });
          await publishQueue.add('publish-post' as any, { scheduledPostId }, { delay, jobId: `publish-${scheduledPostId}-rate-${Date.now()}` });
          rateDelayed++;
          continue;
        }

        const adapter = getAdapter(variant.platform);
        const payload = {
          variantId: variant.id,
          platform: variant.platform,
          accountName: variant.socialAccount.accountName,
          caption: variant.caption,
          hashtags: variant.hashtags,
          linkUrl: variant.linkUrl,
          mediaAssets: variant.mediaAssets,
        };

        const validation = await adapter.validateContent(payload);
        if (!validation.ok) throw new Error(validation.errors.join('; '));

        const result = await adapter.publishPost(payload);
        await prisma.platformPostVariant.update({
          where: { id: variant.id },
          data: {
            validationStatus: validation.warnings.length ? `WARNINGS: ${validation.warnings.join('; ')}` : 'VALID',
            publishStatus: 'PUBLISHED',
            jobStatus: 'COMPLETED',
            platformPostId: result.platformPostId,
            platformPostUrl: result.platformPostUrl,
            publishedAt: result.publishedAt,
            completedAt: new Date(),
            errorMessage: null,
          },
        });

        await analyticsQueue.add(
          'fetch-analytics' as any,
          { platformPostVariantId: variant.id },
          {
            delay: FIRST_ANALYTICS_DELAY_MS,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 200,
            removeOnFail: 500,
          },
        );
        success++;
      } catch (error: any) {
        failure++;
        await prisma.platformPostVariant.update({
          where: { id: variant.id },
          data: {
            publishStatus: 'FAILED',
            jobStatus: 'FAILED',
            errorMessage: error?.message || 'Unknown publishing error',
          },
        });
      }
    }

    const finalStatus =
      failure === 0 && rateDelayed === 0
        ? 'PUBLISHED'
        : success > 0
          ? 'PARTIALLY_FAILED'
          : rateDelayed > 0
            ? 'QUEUED'
            : 'FAILED';

    await prisma.scheduledPost.update({
      where: { id: scheduled.id },
      data: { status: finalStatus as any },
    });

    if (finalStatus === 'PUBLISHED') {
      const evergreen = await prisma.queuedContent.findFirst({
        where: { contentItemId: scheduled.contentItemId, isEvergreen: true }
      });
      if (evergreen) {
        await prisma.queuedContent.update({
          where: { id: evergreen.id },
          data: { lastPublishedAt: new Date(), status: 'QUEUED' }
        });
      }
    }

    return { success, failure, rateDelayed };
  },
  { connection: connection as any, concurrency: 5 },
);

new Worker<AnalyticsJobData>(
  ANALYTICS_QUEUE,
  async (job) => fetchAndStoreAnalytics(job.data.platformPostVariantId),
  { connection: connection as any, concurrency: 10 },
);

async function fetchAndStoreAnalytics(platformPostVariantId: string) {
  const variant = await prisma.platformPostVariant.findUnique({ where: { id: platformPostVariantId } });
  if (!variant || !variant.platformPostId) return { skipped: true };

  const adapter = getAdapter(variant.platform);
  const metrics = await adapter.fetchAnalytics(variant.platformPostId);

  await prisma.analyticsSnapshot.create({
    data: {
      platformPostVariantId: variant.id,
      platform: variant.platform,
      ...metrics,
    },
  });

  return metrics;
}

async function syncPublishedAnalytics() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleBefore = new Date(Date.now() - 4 * 60 * 1000);
  const variants = await prisma.platformPostVariant.findMany({
    where: {
      publishStatus: 'PUBLISHED',
      publishedAt: { gte: cutoff },
      platformPostId: { not: null },
    },
    include: { analyticsSnapshots: { orderBy: { collectedAt: 'desc' }, take: 1 }, socialAccount: true },
  });

  for (const variant of variants) {
    const latest = variant.analyticsSnapshots[0];
    if (latest && latest.collectedAt > staleBefore) continue;
    await analyticsQueue.add('fetch-analytics' as any, { platformPostVariantId: variant.id }, { removeOnComplete: 200, removeOnFail: 500 });
  }

  await syncFollowerSnapshots();
  return variants.length;
}

async function syncFollowerSnapshots() {
  let skip = 0;
  let accounts;
  do {
    accounts = await prisma.socialAccount.findMany({ where: { status: 'CONNECTED' }, take: 100, skip });
    for (const account of accounts) {
      const seed = `${account.id}${Date.now().toString().slice(0, -5)}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const followerCount = 1000 + (seed % 12000);
      await prisma.followerSnapshot.create({ data: { socialAccountId: account.id, platform: account.platform, followerCount } });
    }
    skip += 100;
  } while (accounts.length === 100);
}

new Worker('CRON_QUEUE', async (job) => {
  if (job.name === 'analytics-sync') {
    await syncPublishedAnalytics().catch((error) => console.error('Analytics sync failed:', error.message));
  }
}, { connection: connection as any, concurrency: 1 });

async function initCron() {
  await cronQueue.add('analytics-sync' as any, {}, {
    repeat: { pattern: '*/5 * * * *' }
  });
}
initCron();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  await prisma.$disconnect();
  await analyticsQueue.close();
  await publishQueue.close();
  await cronQueue.close();
  await connection.quit();
  process.exit(0);
}

console.log('Workers started: publish queue + analytics queue + cron worker');
