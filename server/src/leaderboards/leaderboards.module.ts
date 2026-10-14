import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardsService } from './leaderboards.service';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { LeaderboardEntry } from '../entities/leaderboard-entry.entity';
import { MatchParticipant } from '../entities/match-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, University, LeaderboardEntry, MatchParticipant])],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}
