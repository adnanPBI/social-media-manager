import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { Platform } from '@prisma/client';
import { randomBytes } from 'crypto';
import { DEMO_WORKSPACE_ID } from '../../common/workspace';
import { getPlatformConfig, PLATFORM_CONFIG } from '../../common/platform-config';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimiterService } from '../rate-limit/rate-limiter.service';
import { MockConnectDto } from './dto';

@Injectable({ scope: Scope.REQUEST })
export class PlatformsService {
  constructor(private prisma: PrismaService, private config: ConfigService, private rateLimiter: RateLimiterService, @Inject(REQUEST) private request: any) {}

  listPlatforms() {
    return Object.values(Platform).map((platform) => ({
      platform,
      displayName: PLATFORM_CONFIG[platform].displayName,
      color: PLATFORM_CONFIG[platform].color,
      scopes: PLATFORM_CONFIG[platform].scopes,
      rateLimit: PLATFORM_CONFIG[platform].rateLimit,
      contentRules: PLATFORM_CONFIG[platform].contentRules,
    }));
  }

  async listAccounts() {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId: this.request.user.workspaceId },
      orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }],
    });
    return Promise.all(accounts.map(async (account) => ({ ...account, quota: await this.rateLimiter.getUsage(account.platform, account.id) })));
  }

  async mockConnect(dto: MockConnectDto) {
    const platformConfig = getPlatformConfig(dto.platform);
    const account = await this.prisma.socialAccount.create({
      data: {
        workspaceId: this.request.user.workspaceId,
        platform: dto.platform,
        accountName: dto.accountName,
        platformAccountId: `mock-${dto.platform.toLowerCase()}-${Date.now()}`,
        accessTokenEncrypted: `mock-access-${Date.now()}`,
        refreshTokenEncrypted: `mock-refresh-${Date.now()}`,
        scopes: platformConfig.scopes,
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        lastQuotaMax: platformConfig.rateLimit.max,
      },
    });

    await this.prisma.auditLog.create({
      data: { workspaceId: this.request.user.workspaceId, action: 'platform.mock_connect', metadata: { platform: dto.platform, accountId: account.id } },
    });

    return account;
  }

  async disconnect(id: string) {
    const account = await this.prisma.socialAccount.update({ where: { id }, data: { status: 'DISCONNECTED' } });
    await this.prisma.auditLog.create({
      data: { workspaceId: this.request.user.workspaceId, action: 'platform.disconnect', metadata: { platform: account.platform, accountId: id } },
    });
    return account;
  }

  async quota(accountId: string) {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Social account not found');
    return this.rateLimiter.getUsage(account.platform, account.id);
  }

  connectUrl(platform: Platform) {
    const mode = this.config.get<string>('PUBLISHING_MODE') || 'mock';
    const cfg = getPlatformConfig(platform);
    const webBase = this.config.get<string>('WEB_BASE_URL') || 'http://localhost:5173';
    if (mode === 'mock') {
      return { mode, platform, url: `${webBase}/?mockConnect=${platform}`, note: 'Mock mode uses the in-app connect button. Set PUBLISHING_MODE=real for OAuth URLs.' };
    }

    const apiBase = this.config.get<string>('PUBLIC_BASE_URL') || `http://localhost:${this.config.get<string>('API_PORT') || 4000}`;
    const redirectUri = this.config.get<string>(`${platform}_REDIRECT_URI`) || `${apiBase.replace(/\/$/, '')}/api/platforms/${platform.toLowerCase()}/callback`;
    const state = randomBytes(16).toString('hex');

    if (platform === Platform.TWITTER) {
      const clientId = this.config.get<string>('TWITTER_CLIENT_ID');
      if (!clientId) throw new BadRequestException('TWITTER_CLIENT_ID is missing');
      const url = `${cfg.authUrl}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(cfg.scopes.join(' '))}&state=${state}&code_challenge=CHANGE_ME_PKCE&code_challenge_method=S256`;
      return { mode, platform, url, redirectUri, state, note: 'Production X OAuth must store a PKCE verifier in Redis before redirect.' };
    }

    if (platform === Platform.TIKTOK) {
      const clientKey = this.config.get<string>('TIKTOK_CLIENT_KEY');
      if (!clientKey) throw new BadRequestException('TIKTOK_CLIENT_KEY is missing');
      const url = `${cfg.authUrl}?client_key=${encodeURIComponent(clientKey)}&scope=${encodeURIComponent(cfg.scopes.join(','))}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      return { mode, platform, url, redirectUri, state };
    }

    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    if (!appId) throw new BadRequestException('FACEBOOK_APP_ID is missing');
    const url = `${cfg.authUrl}?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(cfg.scopes.join(','))}&state=${state}&response_type=code`;
    return { mode, platform, url, redirectUri, state, note: platform === Platform.INSTAGRAM ? 'Instagram connection is usually resolved from a linked Facebook Page/business account.' : undefined };
  }

  oauthCallback(platform: Platform, code?: string, state?: string) {
    // Intentional safe placeholder: real callback exchange requires client secrets and platform approval.
    const webBase = this.config.get<string>('WEB_BASE_URL') || 'http://localhost:5173';
    return `${webBase}/?oauth_success=true&platform=${platform}`;
  }
}
