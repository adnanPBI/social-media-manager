import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class AnalyticsService {
  constructor(private prisma: PrismaService, @Inject(REQUEST) private request: any) {}

  async overview() {
    const variants = await this.prisma.platformPostVariant.findMany({
      where: { scheduledPost: { workspaceId: this.request.user.workspaceId } },
      include: {
        socialAccount: true,
        scheduledPost: { include: { contentItem: true } },
        analyticsSnapshots: { orderBy: { collectedAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const latestSnapshots = variants.flatMap((variant) => (variant.analyticsSnapshots[0] ? [variant.analyticsSnapshots[0]] : []));

    const totals = latestSnapshots.reduce(
      (acc, s) => {
        acc.reach += s.reach;
        acc.impressions += s.impressions;
        acc.engagement += s.engagement;
        acc.clicks += s.clicks;
        acc.likes += s.likes;
        acc.comments += s.comments;
        acc.shares += s.shares;
        acc.saves += s.saves;
        return acc;
      },
      { reach: 0, impressions: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
    );

    const platformMap = new Map<string, any>();
    for (const s of latestSnapshots) {
      const key = s.platform;
      const row = platformMap.get(key) || { platform: key, reach: 0, impressions: 0, engagement: 0, clicks: 0 };
      row.reach += s.reach;
      row.impressions += s.impressions;
      row.engagement += s.engagement;
      row.clicks += s.clicks;
      platformMap.set(key, row);
    }

    const allSnapshots = await this.prisma.analyticsSnapshot.findMany({
      where: { platformPostVariant: { scheduledPost: { workspaceId: this.request.user.workspaceId } } },
      orderBy: { collectedAt: 'asc' },
      take: 500,
    });

    const timelineMap = new Map<string, any>();
    for (const s of allSnapshots) {
      const key = `${s.collectedAt.toISOString().slice(0, 16)}-${s.platform}`;
      const row = timelineMap.get(key) || { collectedAt: s.collectedAt, platform: s.platform, reach: 0, impressions: 0, engagement: 0, clicks: 0 };
      row.reach += s.reach;
      row.impressions += s.impressions;
      row.engagement += s.engagement;
      row.clicks += s.clicks;
      timelineMap.set(key, row);
    }

    const followerSnapshots = await this.prisma.followerSnapshot.findMany({
      where: { socialAccount: { workspaceId: this.request.user.workspaceId } },
      orderBy: { collectedAt: 'asc' },
      take: 200,
    });

    const followerGrowth = followerSnapshots.map((row) => ({
      collectedAt: row.collectedAt,
      platform: row.platform,
      followerCount: row.followerCount,
    }));

    const statusCounts = await this.prisma.scheduledPost.groupBy({
      by: ['status'],
      where: { workspaceId: this.request.user.workspaceId },
      _count: { _all: true },
    });

    return {
      totals,
      platformBreakdown: Array.from(platformMap.values()),
      timeline: Array.from(timelineMap.values()),
      followerGrowth,
      statusCounts: Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all])),
      posts: variants.map((post) => ({
        id: post.id,
        title: post.scheduledPost.contentItem.title,
        platform: post.platform,
        accountName: post.socialAccount.accountName,
        status: post.publishStatus,
        jobStatus: post.jobStatus,
        url: post.platformPostUrl,
        publishedAt: post.publishedAt,
        errorMessage: post.errorMessage,
        rateDelayedUntil: post.rateDelayedUntil,
        metrics: post.analyticsSnapshots[0] || null,
      })),
    };
  }
}
