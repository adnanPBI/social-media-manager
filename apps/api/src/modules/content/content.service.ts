import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto, UpdateContentDto } from './dto';

@Injectable({ scope: Scope.REQUEST })
export class ContentService {
  constructor(private prisma: PrismaService, @Inject(REQUEST) private request: any) {}

  list(status?: string) {
    return this.prisma.contentItem.findMany({
      where: {
        workspaceId: this.request.user.workspaceId,
        ...(status ? { approvalStatus: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateContentDto, approved = false) {
    return this.prisma.contentItem.create({
      data: {
        workspaceId: this.request.user.workspaceId,
        cmsContentId: dto.cmsContentId,
        title: dto.title,
        body: dto.body,
        mediaAssets: dto.mediaAssets || [],
        hashtags: normaliseHashtags(dto.hashtags || []),
        linkUrl: dto.linkUrl || 'https://youtube.com/@cancel910gas',
        approvalStatus: approved ? 'APPROVED' : 'DRAFT',
        approvedAt: approved ? new Date() : null,
      },
    });
  }

  webhookApproved(dto: CreateContentDto) {
    return this.create(dto, true);
  }

  async update(id: string, dto: UpdateContentDto) {
    await this.ensureExists(id);
    return this.prisma.contentItem.update({
      where: { id },
      data: {
        cmsContentId: dto.cmsContentId,
        title: dto.title,
        body: dto.body,
        mediaAssets: dto.mediaAssets || [],
        hashtags: normaliseHashtags(dto.hashtags || []),
        linkUrl: dto.linkUrl,
      },
    });
  }

  async submitForApproval(id: string) {
    await this.ensureExists(id);
    return this.prisma.contentItem.update({ where: { id }, data: { approvalStatus: 'PENDING_APPROVAL' } });
  }

  async approve(id: string) {
    await this.ensureExists(id);
    return this.prisma.contentItem.update({
      where: { id },
      data: { approvalStatus: 'APPROVED', approvedAt: new Date(), rejectedAt: null },
    });
  }

  async reject(id: string) {
    await this.ensureExists(id);
    return this.prisma.contentItem.update({
      where: { id },
      data: { approvalStatus: 'REJECTED', rejectedAt: new Date() },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.contentItem.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const content = await this.prisma.contentItem.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content item not found');
    return content;
  }
}

function normaliseHashtags(tags: string[]) {
  return tags.map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean);
}
