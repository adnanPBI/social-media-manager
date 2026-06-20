import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analytics.overview();
  }
}
