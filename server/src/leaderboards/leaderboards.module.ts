import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardsService } from './leaderboards.service';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { LeaderboardEntry } from '../entities/leaderboard-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, University, LeaderboardEntry])],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}
