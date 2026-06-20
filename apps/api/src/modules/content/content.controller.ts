import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentDto, UpdateContentDto } from './dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private content: ContentService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.content.list(status);
  }

  @Post()
  create(@Body() dto: CreateContentDto) {
    return this.content.create(dto, false);
  }

  @Post('approved')
  createApproved(@Body() dto: CreateContentDto) {
    return this.content.create(dto, true);
  }

  @Post('webhooks/cms/approved-content')
  cmsApproved(@Body() dto: CreateContentDto) {
    return this.content.webhookApproved(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.content.update(id, dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string) {
    return this.content.submitForApproval(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.content.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.content.reject(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.content.remove(id);
  }
}
