import { Module } from '@nestjs/common';
import { RateLimiterModule } from '../rate-limit/rate-limiter.module';
import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';

@Module({
  imports: [RateLimiterModule],
  providers: [PlatformsService],
  controllers: [PlatformsController],
  exports: [PlatformsService],
})
export class PlatformsModule {}
