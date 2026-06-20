export type Platform = 'FACEBOOK' | 'INSTAGRAM' | 'TWITTER' | 'TIKTOK';

export type Quota = { used: number; max: number; remaining: number; windowMs: number };

export type SocialAccount = {
  id: string;
  platform: Platform;
  accountName: string;
  status: string;
  scopes?: string[];
  lastSyncAt?: string;
  tokenExpiresAt?: string;
  quota?: Quota;
};

export type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
};

export type ContentItem = {
  id: string;
  title: string;
  body: string;
  approvalStatus: string;
  approvedAt?: string;
  hashtags?: string[];
  linkUrl?: string;
  mediaAssets?: Array<string | MediaAsset>;
};

export type ScheduledPost = {
  id: string;
  scheduledTime: string;
  timezone: string;
  status: string;
  contentItem: ContentItem;
  variants: Array<{
    id: string;
    platform: Platform;
    caption: string;
    publishStatus: string;
    jobStatus?: string;
    platformPostUrl?: string;
    errorMessage?: string;
    rateDelayedUntil?: string;
    socialAccount: SocialAccount;
  }>;
};

export type AnalyticsOverview = {
  totals: {
    reach: number;
    impressions: number;
    engagement: number;
    clicks: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  platformBreakdown: Array<{ platform: Platform; reach: number; impressions: number; engagement: number; clicks: number }>;
  timeline: Array<{ collectedAt: string; platform: Platform; reach: number; impressions: number; engagement: number; clicks: number }>;
  followerGrowth: Array<{ collectedAt: string; platform: Platform; followerCount: number }>;
  statusCounts: Record<string, number>;
  posts: Array<{ id: string; title: string; platform: Platform; accountName: string; status: string; jobStatus?: string; url?: string; publishedAt?: string; errorMessage?: string; rateDelayedUntil?: string; metrics?: any }>;
};
