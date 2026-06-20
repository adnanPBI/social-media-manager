import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { stringify } from 'csv-stringify/sync';
import { chromium } from 'playwright';
import { DEMO_WORKSPACE_ID } from '../../common/workspace';
import { PrismaService } from '../prisma/prisma.service';

import { format } from 'date-fns';

@Injectable({ scope: Scope.REQUEST })
export class ReportsService {
  constructor(private prisma: PrismaService, @Inject(REQUEST) private request: any) {}

  async rows() {
    const posts = await this.prisma.platformPostVariant.findMany({
      where: { scheduledPost: { workspaceId: this.request.user.workspaceId } },
      include: {
        scheduledPost: { include: { contentItem: true } },
        analyticsSnapshots: { orderBy: { collectedAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return posts.map((post) => {
      const metrics = post.analyticsSnapshots[0];
      return {
        title: post.scheduledPost.contentItem.title,
        platform: post.platform,
        status: post.publishStatus,
        scheduledTime: post.scheduledPost.scheduledTime.toISOString(),
        publishedAt: post.publishedAt?.toISOString() || '',
        url: post.platformPostUrl || '',
        reach: metrics?.reach || 0,
        impressions: metrics?.impressions || 0,
        engagement: metrics?.engagement || 0,
        likes: metrics?.likes || 0,
        comments: metrics?.comments || 0,
        shares: metrics?.shares || 0,
        saves: metrics?.saves || 0,
        clicks: metrics?.clicks || 0,
        engagementRate: metrics?.engagementRate || 0,
      };
    });
  }

  async csv() {
    const rows = await this.rows();
    return stringify(rows, { header: true });
  }

  async pdf() {
    const rows = await this.rows();
    const totals = rows.reduce(
      (acc, row) => {
        acc.reach += row.reach;
        acc.impressions += row.impressions;
        acc.engagement += row.engagement;
        acc.clicks += row.clicks;
        return acc;
      },
      { reach: 0, impressions: 0, engagement: 0, clicks: 0 },
    );

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            h1 { margin-bottom: 4px; }
            .muted { color: #6b7280; }
            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
            .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; background: #f9fafb; }
            .value { font-size: 22px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background: #111827; color: white; }
          </style>
        </head>
        <body>
          <h1>Social Media Analytics Report</h1>
          <div class="muted">Generated ${new Date().toISOString()}</div>
          <div class="cards">
            <div class="card"><div class="muted">Reach</div><div class="value">${totals.reach}</div></div>
            <div class="card"><div class="muted">Impressions</div><div class="value">${totals.impressions}</div></div>
            <div class="card"><div class="muted">Engagement</div><div class="value">${totals.engagement}</div></div>
            <div class="card"><div class="muted">Clicks</div><div class="value">${totals.clicks}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Platform</th><th>Status</th><th>Reach</th><th>Impressions</th><th>Engagement</th><th>Clicks</th><th>Published</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td>${row.platform}</td><td>${row.status}</td><td>${row.reach}</td><td>${row.impressions}</td><td>${row.engagement}</td><td>${row.clicks}</td><td>${row.publishedAt}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>`;

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return buffer;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
