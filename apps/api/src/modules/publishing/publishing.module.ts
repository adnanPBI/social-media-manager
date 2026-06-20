import { Module } from '@nestjs/common';
import { PublishingController } from './publishing.controller';
import { PublishingQueueService } from './publishing-queue.service';

@Module({
  providers: [PublishingQueueService],
  controllers: [PublishingController],
  exports: [PublishingQueueService],
})
export class PublishingModule {}
