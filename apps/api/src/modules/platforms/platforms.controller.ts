import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { Response } from 'express';
import { MockConnectDto } from './dto';
import { PlatformsService } from './platforms.service';

@ApiTags('platforms')
@Controller('platforms')
export class PlatformsController {
  constructor(private platforms: PlatformsService) {}

  @Get()
  listPlatforms() {
    return this.platforms.listPlatforms();
  }

  @Get('accounts')
  listAccounts() {
    return this.platforms.listAccounts();
  }

  @Get('accounts/:id/quota')
  quota(@Param('id') id: string) {
    return this.platforms.quota(id);
  }

  @Get(':platform/connect-url')
  connectUrl(@Param('platform') platform: Platform) {
    return this.platforms.connectUrl(platform.toUpperCase() as Platform);
  }

  @Get(':platform/callback')
  callback(@Param('platform') platform: Platform, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string) {
    const url = this.platforms.oauthCallback(platform.toUpperCase() as Platform, code, state);
    return res.redirect(url);
  }

  @Post('mock-connect')
  mockConnect(@Body() dto: MockConnectDto) {
    return this.platforms.mockConnect(dto);
  }

  @Delete('accounts/:id')
  disconnect(@Param('id') id: string) {
    return this.platforms.disconnect(id);
  }
}
