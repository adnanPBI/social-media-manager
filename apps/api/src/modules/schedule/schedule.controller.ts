import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateScheduleDto, RescheduleDto } from './dto';
import { ScheduleService } from './schedule.service';

@ApiTags('schedule')
@Controller('schedule')
export class ScheduleController {
  constructor(private schedule: ScheduleService) {}

  @Get()
  list() {
    return this.schedule.list();
  }

  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.schedule.create(dto);
  }

  @Post(':id/reschedule')
  reschedule(@Param('id') id: string, @Body() dto: RescheduleDto) {
    return this.schedule.reschedule(id, dto);
  }

  @Post(':id/publish-now')
  publishNow(@Param('id') id: string) {
    return this.schedule.publishNow(id);
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.schedule.cancel(id);
  }
}
