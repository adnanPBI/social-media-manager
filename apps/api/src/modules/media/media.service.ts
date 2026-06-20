import { Inject, Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class MediaService {
  constructor(private prisma: PrismaService, private config: ConfigService, @Inject(REQUEST) private request: any) {}

  publicUrl(filename: string) {
    const publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL') || `http://localhost:${this.config.get<string>('API_PORT') || 4000}`;
    return `${publicBaseUrl.replace(/\/$/, '')}/uploads/${filename}`;
  }

  async registerFiles(files: Array<Express.Multer.File>) {
    const created: any[] = [];
    for (const file of files) {
      const asset = await this.prisma.mediaAsset.create({
        data: {
          workspaceId: this.request.user.workspaceId,
          url: this.publicUrl(file.filename),
          filename: file.filename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          kind: file.mimetype.startsWith('video/') ? 'video' : 'image',
          storage: this.config.get<string>('STORAGE_DRIVER') || 'local',
        },
      });
      created.push(asset);
    }
    return created;
  }

  list() {
    return this.prisma.mediaAsset.findMany({ where: { workspaceId: this.request.user.workspaceId }, orderBy: { createdAt: 'desc' } });
  }
}
