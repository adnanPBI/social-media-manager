import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { InboxService } from './inbox.service';

@Controller('webhooks/inbox')
export class InboxWebhookController {
  constructor(private readonly inboxService: InboxService) {}

  @Post('platform-event')
  async handlePlatformEvent(
    @Headers('x-platform-signature') signature: string,
    @Body() payload: any,
  ) {
    if (!signature) throw new BadRequestException('Missing signature');
    return this.inboxService.processIncomingEvent(payload);
  }
}
