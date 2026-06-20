import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublishingQueueService } from './publishing-queue.service';

@ApiTags('publishing')
@Controller('publishing')
export class PublishingController {
  constructor(private queue: PublishingQueueService) {}

  @Get('queue-metrics')
  metrics() {
    return this.queue.getMetrics();
  }
}
