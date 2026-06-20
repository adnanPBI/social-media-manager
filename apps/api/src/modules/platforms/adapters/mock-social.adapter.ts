import { Platform } from '@prisma/client';
import { getPlatformConfig } from '../../../common/platform-config';
import { AnalyticsResult, PublishResult, SocialPayload, SocialPlatformAdapter, ValidationResult } from '../types';

const platformBaseUrls: Record<Platform, string> = {
  FACEBOOK: 'https://facebook.example/posts',
  INSTAGRAM: 'https://instagram.example/p',
  TWITTER: 'https://x.example/status',
  TIKTOK: 'https://tiktok.example/@demo/video',
};

type MediaLike = { url?: string; mimeType?: string; kind?: string } | string;

export class MockSocialAdapter implements SocialPlatformAdapter {
  constructor(public platform: Platform) {}

  async validateContent(payload: SocialPayload): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const cfg = getPlatformConfig(payload.platform);
    const hashtags = payload.hashtags || [];
    const fullCaption = [payload.caption, ...hashtags.map((h) => `#${h.replace(/^#/, '')}`), payload.linkUrl || ''].join(' ').trim();

    if (!payload.caption || payload.caption.trim().length < 5) {
      errors.push('Caption must contain at least 5 characters.');
    }

    if (cfg.contentRules.maxCaptionLength && fullCaption.length > cfg.contentRules.maxCaptionLength) {
      errors.push(`${cfg.displayName} caption exceeds ${cfg.contentRules.maxCaptionLength} characters.`);
    }

    const media = Array.isArray(payload.mediaAssets) ? (payload.mediaAssets as MediaLike[]) : [];
    const hasVideo = media.some((item) => typeof item === 'string' ? /\.(mp4|mov)$/i.test(item) : item.kind === 'video' || item.mimeType?.startsWith('video/'));
    const hasImage = media.some((item) => typeof item === 'string' ? /\.(jpg|jpeg|png|webp|gif)$/i.test(item) : item.kind === 'image' || item.mimeType?.startsWith('image/'));

    if (cfg.contentRules.requiresVideo && !hasVideo) {
      warnings.push(`${cfg.displayName} usually requires video media for production publishing. Mock mode will still publish.`);
    }

    if (!cfg.contentRules.supportsImages && hasImage) {
      warnings.push(`${cfg.displayName} adapter will ignore image-only media in production unless a supported API path exists.`);
    }

    if (payload.linkUrl && !payload.linkUrl.startsWith('http')) {
      errors.push('Link URL must start with http or https.');
    }

    if (payload.platform === 'INSTAGRAM' && payload.linkUrl) {
      warnings.push('Instagram captions may not make ordinary URLs clickable; use profile/CTA strategy where needed.');
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  async publishPost(payload: SocialPayload): Promise<PublishResult> {
    const id = `${payload.platform.toLowerCase()}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    return {
      platformPostId: id,
      platformPostUrl: `${platformBaseUrls[payload.platform]}/${id}`,
      publishedAt: new Date(),
    };
  }

  async fetchAnalytics(platformPostId: string): Promise<AnalyticsResult> {
    const seed = platformPostId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const impressions = 250 + (seed % 5000);
    const reach = Math.round(impressions * 0.72);
    const likes = 10 + (seed % 250);
    const comments = seed % 60;
    const shares = seed % 45;
    const saves = seed % 25;
    const clicks = 5 + (seed % 120);
    const engagement = likes + comments + shares + saves + clicks;
    const followerCount = 1000 + (seed % 9000);
    const engagementRate = Number(((engagement / Math.max(impressions, 1)) * 100).toFixed(2));

    return { reach, impressions, engagement, likes, comments, shares, saves, clicks, followerCount, engagementRate };
  }
}
