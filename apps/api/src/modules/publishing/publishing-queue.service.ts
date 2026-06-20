import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PUBLISH_QUEUE, PublishJobData } from '../../common/queues';

@Injectable()
export class PublishingQueueService implements OnModuleDestroy {
  private connection: IORedis;
  private queue: Queue<PublishJobData>;

  constructor(private config: ConfigService) {
    this.connection = new IORedis(this.config.get<string>('REDIS_URL') || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    }) as any;
    this.queue = new Queue<PublishJobData>(PUBLISH_QUEUE, { connection: this.connection as any }) as any;
  }

  async enqueuePublish(scheduledPostId: string, scheduledTime: Date, force = false) {
    const delay = Math.max(0, scheduledTime.getTime() - Date.now());
    const jobId = `publish-${scheduledPostId}`;

    if (force) {
      const existing = await this.queue.getJob(jobId);
      if (existing) await existing.remove().catch(() => null);
    }

    return this.queue.add(
      'publish-post' as any,
      { scheduledPostId, force },
      {
        jobId,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async getMetrics() {
    const [waiting, active, delayed, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getDelayedCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);
    return { waiting, active, delayed, completed, failed };
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}
