import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { DEMO_WORKSPACE_ID } from '../../common/workspace';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingQueueService } from '../publishing/publishing-queue.service';
import { CreateScheduleDto, RescheduleDto } from './dto';
import { getPlatformConfig } from '../../common/platform-config';

@Injectable({ scope: Scope.REQUEST })
export class ScheduleService {
  constructor(private prisma: PrismaService, private queue: PublishingQueueService, @Inject(REQUEST) private request: any) {}

  list() {
    return this.prisma.scheduledPost.findMany({
      where: { workspaceId: this.request.user.workspaceId },
      include: { contentItem: true, variants: { include: { socialAccount: true } } },
      orderBy: { scheduledTime: 'asc' },
    });
  }

  async create(dto: CreateScheduleDto) {
    if (!dto.variants.length) throw new BadRequestException('At least one platform variant is required.');
    const content = await this.prisma.contentItem.findUnique({ where: { id: dto.contentItemId } });
    if (!content) throw new NotFoundException('Content item not found');
    if (content.approvalStatus !== 'APPROVED') throw new BadRequestException('Only approved content can be scheduled.');

    for (const variant of dto.variants) {
      const account = await this.prisma.socialAccount.findUnique({ where: { id: variant.socialAccountId } });
      if (!account || account.platform !== variant.platform || account.status !== 'CONNECTED') {
        throw new BadRequestException(`Invalid or disconnected account for ${variant.platform}`);
      }
    }

    const scheduledTime = new Date(dto.scheduledTime);
    const scheduled = await this.prisma.scheduledPost.create({
      data: {
        workspaceId: this.request.user.workspaceId,
        contentItemId: dto.contentItemId,
        scheduledTime,
        timezone: dto.timezone || 'UTC',
        status: 'QUEUED',
        variants: {
          create: dto.variants.map((variant) => ({
            platform: variant.platform,
            socialAccount: { connect: { id: variant.socialAccountId } },
            caption: variant.caption,
            hashtags: variant.hashtags?.length ? variant.hashtags.map((h) => h.replace(/^#/, '')) : content.hashtags,
            linkUrl: variant.linkUrl || content.linkUrl,
            mediaAssets: content.mediaAssets as any,
            publishStatus: 'QUEUED',
            jobStatus: 'PENDING',
          })),
        },
      },
      include: { contentItem: true, variants: { include: { socialAccount: true } } },
    });

    const job = await this.queue.enqueuePublish(scheduled.id, scheduledTime, true);
    await this.prisma.platformPostVariant.updateMany({ where: { scheduledPostId: scheduled.id }, data: { bullJobId: job.id?.toString() } });

    await this.prisma.auditLog.create({
      data: { workspaceId: this.request.user.workspaceId, action: 'schedule.create', metadata: { scheduledPostId: scheduled.id, scheduledTime } },
    });

    return this.prisma.scheduledPost.findUnique({
      where: { id: scheduled.id },
      include: { contentItem: true, variants: { include: { socialAccount: true } } },
    });
  }

  async reschedule(id: string, dto: RescheduleDto) {
    const scheduled = await this.prisma.scheduledPost.findUnique({ where: { id } });
    if (!scheduled) throw new NotFoundException('Scheduled post not found');
    if (['PUBLISHED', 'CANCELLED'].includes(scheduled.status)) {
      throw new BadRequestException('Published or cancelled posts cannot be rescheduled.');
    }

    const scheduledTime = new Date(dto.scheduledTime);
    const updated = await this.prisma.scheduledPost.update({
      where: { id },
      data: {
        scheduledTime,
        status: 'QUEUED',
        variants: { updateMany: { where: {}, data: { publishStatus: 'QUEUED', jobStatus: 'PENDING', errorMessage: null, rateDelayedUntil: null } } },
      },
      include: { contentItem: true, variants: { include: { socialAccount: true } } },
    });

    const job = await this.queue.enqueuePublish(updated.id, scheduledTime, true);
    await this.prisma.platformPostVariant.updateMany({ where: { scheduledPostId: updated.id }, data: { bullJobId: job.id?.toString() } });

    await this.prisma.auditLog.create({
      data: { workspaceId: this.request.user.workspaceId, action: 'schedule.reschedule', metadata: { scheduledPostId: id, scheduledTime } },
    });

    return this.prisma.scheduledPost.findUnique({
      where: { id },
      include: { contentItem: true, variants: { include: { socialAccount: true } } },
    });
  }

  async publishNow(id: string) {
    const scheduled = await this.prisma.scheduledPost.findUnique({ where: { id } });
    if (!scheduled) throw new NotFoundException('Scheduled post not found');
    const job = await this.queue.enqueuePublish(id, new Date(), true);
    await this.prisma.platformPostVariant.updateMany({ where: { scheduledPostId: id }, data: { bullJobId: job.id?.toString(), jobStatus: 'PENDING' } });
    return { queued: true, jobId: job.id };
  }

  async cancel(id: string) {
    const scheduled = await this.prisma.scheduledPost.update({
      where: { id },
      data: { status: 'CANCELLED', variants: { updateMany: { where: {}, data: { jobStatus: 'CANCELLED' } } } },
    });
    await this.prisma.auditLog.create({
      data: { workspaceId: this.request.user.workspaceId, action: 'schedule.cancel', metadata: { scheduledPostId: id } },
    });
    return scheduled;
  }

  async allocateQueueSlots(queueId: string) {
    const queue = await this.prisma.publishingQueue.findUnique({
      where: { id: queueId },
      include: { timeSlots: true, queuedContents: { where: { status: 'QUEUED' }, orderBy: { updatedAt: 'asc' } } }
    });
    
    if (!queue || !queue.timeSlots.length || !queue.queuedContents.length) return { allocated: 0 };
    
    let allocated = 0;
    // Basic allocation logic: map each queued content to the next available time slot
    for (const content of queue.queuedContents) {
      // In a full implementation, we'd calculate the next valid date for a given time slot
      // For now, mark them as allocated and prepare for scheduling
      await this.prisma.queuedContent.update({
        where: { id: content.id },
        data: { status: 'ALLOCATED' }
      });
      allocated++;
    }
    
    return { allocated };
  }
}
