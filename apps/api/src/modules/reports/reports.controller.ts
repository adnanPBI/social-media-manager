import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('export.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="social-media-report.csv"')
  async csv() {
    return this.reports.csv();
  }

  @Get('export.pdf')
  async pdf(@Res() res: Response) {
    const buffer = await this.reports.pdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="social-media-report.pdf"');
    res.send(buffer);
  }
}
