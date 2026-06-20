import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto';

@ApiTags('cms-webhooks')
@Controller('webhooks/cms')
export class CmsWebhooksController {
  constructor(private content: ContentService) {}

  @Post('approved-content')
  approvedContent(@Body() dto: CreateContentDto) {
    return this.content.webhookApproved(dto);
  }
}
