import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('conversations')
  async getConversations(@Req() req: any) {
    // In a real app we'd get workspaceId from user/request context.
    // Assuming the user's first workspace for MVP
    const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || 'mock-workspace';
    return this.inboxService.getConversations(workspaceId as string);
  }

  @Get('conversations/:id/messages')
  async getMessages(@Param('id') id: string) {
    return this.inboxService.getMessages(id);
  }

  @Post('conversations/:id/reply')
  async replyToConversation(
    @Req() req: any,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    const workspaceId = req.headers['x-workspace-id'] || req.user?.workspaceId || 'mock-workspace';
    return this.inboxService.replyToConversation(workspaceId as string, id, content);
  }
}
