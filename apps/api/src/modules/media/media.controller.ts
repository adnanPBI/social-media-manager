import { BadRequestException, Controller, Get, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { MediaService } from './media.service';

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov']);
const maxFileBytes = 200 * 1024 * 1024;

function filename(_req: any, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) {
  const ext = extname(file.originalname).toLowerCase();
  callback(null, `${Date.now()}-${randomBytes(16).toString('hex')}${ext}`);
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  @Get()
  list() {
    return this.media.list();
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } } } })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({ destination: process.env.UPLOAD_DIR || './uploads', filename }),
      limits: { fileSize: maxFileBytes, files: 10 },
      fileFilter: (_req, file, callback) => {
        if (!allowedMime.has(file.mimetype)) return callback(new BadRequestException(`Unsupported file type: ${file.mimetype}`) as any, false);
        const ext = extname(file.originalname).toLowerCase();
        if (!allowedExtensions.has(ext)) return callback(new BadRequestException(`Unsupported file extension: ${ext}`) as any, false);
        callback(null, true);
      },
    }),
  )
  async upload(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files?.length) throw new BadRequestException('No files uploaded');
    const saved = await this.media.registerFiles(files);
    return { files: saved };
  }
}
