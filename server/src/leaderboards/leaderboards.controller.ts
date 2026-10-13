import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly service: LeaderboardsService) {}

  @Get('players')
  getPlayerBoard(@Query() dto: LeaderboardQueryDto) {
    return this.service.getPlayerBoard(dto);
  }

  @Get('players/me')
  @UseGuards(JwtAuthGuard)
  getOwnRank(@CurrentUser('id') userId: string) {
    return this.service.getOwnRank(userId);
  }

  @Get('universities')
  getUniversityBoard(@Query() dto: LeaderboardQueryDto) {
    return this.service.getUniversityBoard(dto);
  }
}
