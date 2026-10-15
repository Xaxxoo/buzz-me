import { Controller, Post, Get, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'reviewed' | 'resolved' | 'dismissed' },
  ) {
    return this.service.updateStatus(id, body.status);
  }
}
