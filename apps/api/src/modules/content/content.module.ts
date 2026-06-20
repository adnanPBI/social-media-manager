import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { CmsWebhooksController } from './cms-webhooks.controller';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController, CmsWebhooksController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
