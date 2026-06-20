import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InboxGateway } from './inbox.gateway';
import { Platform } from '@prisma/client';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: InboxGateway,
  ) {}

  async processIncomingEvent(payload: any) {
    this.logger.log(`Received incoming event: ${JSON.stringify(payload)}`);
    // Mock logic for processing a platform event
    const workspaceId = payload.workspaceId || 'mock-workspace';
    const socialAccountId = payload.socialAccountId || 'mock-account';
    const platform = payload.platform || Platform.FACEBOOK;
    
    // Attempt to normalize the message
    const messageContent = payload.message?.text || 'New message';
    
    // Find or create contact
    const contact = await this.prisma.inboxContact.upsert({
      where: {
        workspaceId_platform_platformUserId: {
          workspaceId,
          platform,
          platformUserId: payload.senderId || 'unknown-sender',
        }
      },
      create: {
        workspaceId,
        platform,
        platformUserId: payload.senderId || 'unknown-sender',
        name: payload.senderName || 'Unknown User',
      },
      update: {}
    });

    // Find or create conversation
    let conversation = await this.prisma.inboxConversation.findFirst({
      where: {
        workspaceId,
        socialAccountId,
        contactId: contact.id,
      }
    });

    if (!conversation) {
      conversation = await this.prisma.inboxConversation.create({
        data: {
          workspaceId,
          socialAccountId,
          contactId: contact.id,
          status: 'OPEN',
        }
      });
    }

    // Add message
    const message = await this.prisma.inboxMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        content: messageContent,
        platformMessageId: payload.messageId || Date.now().toString(),
      }
    });

    // Broadcast to connected clients
    this.gateway.broadcastNewMessage(workspaceId, {
      conversationId: conversation.id,
      message,
    });

    return { success: true };
  }
}
