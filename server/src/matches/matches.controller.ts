import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('matches')
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(
    @CurrentUser('id') userId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.service.getHistory(userId, dto.page, dto.limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getDetail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }
}
