import { Module } from '@nestjs/common';
import { PublishingModule } from '../publishing/publishing.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [PublishingModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
