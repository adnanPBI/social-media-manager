import { Platform } from '@prisma/client';

export type SocialPayload = {
  variantId: string;
  platform: Platform;
  accountName: string;
  caption: string;
  hashtags: string[];
  linkUrl?: string | null;
  mediaAssets: unknown;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type PublishResult = {
  platformPostId: string;
  platformPostUrl: string;
  publishedAt: Date;
};

export type AnalyticsResult = {
  reach: number;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  followerCount: number;
  engagementRate: number;
};

export interface SocialPlatformAdapter {
  platform: Platform;
  validateContent(payload: SocialPayload): Promise<ValidationResult>;
  publishPost(payload: SocialPayload): Promise<PublishResult>;
  fetchAnalytics(platformPostId: string): Promise<AnalyticsResult>;
}
