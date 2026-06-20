import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContentModule } from './modules/content/content.module';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MediaModule } from './modules/media/media.module';
import { RateLimiterModule } from './modules/rate-limit/rate-limiter.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { InboxModule } from './modules/inbox/inbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PlatformsModule,
    ContentModule,
    ScheduleModule,
    PublishingModule,
    AnalyticsModule,
    ReportsModule,
    MediaModule,
    RateLimiterModule,
    InboxModule,
  ],
})
export class AppModule {}
