import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateQuestionDto } from './dto/create-question.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Get('daily')
  @UseGuards(JwtAuthGuard)
  getDaily() {
    const date = new Date().toISOString().slice(0, 10);
    return this.service.getDailySet(date);
  }

  // ---------- Admin CMS endpoints ----------

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category_id') categoryId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('active') active?: string,
  ) {
    return this.service.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      categoryId,
      difficulty,
      active: active === undefined ? undefined : active === 'true',
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() dto: CreateQuestionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(@Param('id') id: string, @Body() dto: Partial<CreateQuestionDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
