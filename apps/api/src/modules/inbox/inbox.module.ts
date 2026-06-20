import { Module } from '@nestjs/common';
import { InboxWebhookController } from './inbox-webhook.controller';
import { InboxService } from './inbox.service';
import { InboxGateway } from './inbox.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InboxWebhookController],
  providers: [InboxService, InboxGateway],
  exports: [InboxService, InboxGateway],
})
export class InboxModule {}
