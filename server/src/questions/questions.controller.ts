import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateQuestionDto) {
    return this.service.create(dto);
  }
}
