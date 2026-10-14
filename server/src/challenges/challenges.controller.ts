import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';

@Controller('challenges')
export class ChallengesController {
  constructor(private challengesService: ChallengesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() dto: CreateChallengeDto) {
    return this.challengesService.create(req.user.id, dto);
  }

  @Get()
  async list(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.challengesService.findAll({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.challengesService.findOne(id);
  }

  @Get('code/:share_code')
  async findByCode(@Param('share_code') shareCode: string) {
    return this.challengesService.findByCode(shareCode);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  async accept(@Req() req: any, @Param('id') id: string) {
    return this.challengesService.accept(req.user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.challengesService.cancel(req.user.id, id);
  }
}
