import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { MatchmakingService } from './matchmaking.service';
import { TeamLobbyService } from './team-lobby.service';
import { TeamMatchmakingService } from './team-matchmaking.service';
import { ScoringService } from './scoring.service';
import { UniversityPointsService } from './university-points.service';
import { ChallengeLobbyService } from './challenge-lobby.service';
import { QuestionsModule } from '../questions/questions.module';
import { TeamsModule } from '../teams/teams.module';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { MatchParticipant } from '../entities/match-participant.entity';
import { Round } from '../entities/round.entity';
import { University } from '../entities/university.entity';
import { UniversityDailyPoints } from '../entities/university-daily-points.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Match, MatchParticipant, Round, University, UniversityDailyPoints]),
    QuestionsModule,
    TeamsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  providers: [GameGateway, GameService, MatchmakingService, TeamLobbyService, TeamMatchmakingService, ScoringService, UniversityPointsService, ChallengeLobbyService],
  exports: [GameService, GameGateway, ChallengeLobbyService],
})
export class GameModule {}
