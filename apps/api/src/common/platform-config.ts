import { Platform } from '@prisma/client';

export type PlatformConfig = {
  displayName: string;
  color: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  rateLimit: { windowMs: number; max: number };
  contentRules: {
    maxCaptionLength?: number;
    requiresVideo?: boolean;
    supportsImages?: boolean;
    supportsLinks?: boolean;
  };
};

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  FACEBOOK: {
    displayName: 'Facebook',
    color: '#1877F2',
    authUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'read_insights'],
    rateLimit: { windowMs: 60 * 60 * 1000, max: 200 },
    contentRules: { maxCaptionLength: 63206, supportsImages: true, supportsLinks: true },
  },
  INSTAGRAM: {
    displayName: 'Instagram',
    color: '#E1306C',
    authUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/oauth/access_token',
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list'],
    rateLimit: { windowMs: 24 * 60 * 60 * 1000, max: 50 },
    contentRules: { maxCaptionLength: 2200, supportsImages: true, supportsLinks: false },
  },
  TWITTER: {
    displayName: 'X / Twitter',
    color: '#111827',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    rateLimit: { windowMs: 15 * 60 * 1000, max: 50 },
    contentRules: { maxCaptionLength: 280, supportsImages: true, supportsLinks: true },
  },
  TIKTOK: {
    displayName: 'TikTok',
    color: '#010101',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.publish', 'video.list'],
    rateLimit: { windowMs: 24 * 60 * 60 * 1000, max: 20 },
    contentRules: { maxCaptionLength: 2200, requiresVideo: true, supportsImages: false, supportsLinks: false },
  },
};

export function getPlatformConfig(platform: Platform) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) throw new Error(`Unsupported platform: ${platform}`);
  return config;
}
