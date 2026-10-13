import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { MatchmakingService } from './matchmaking.service';
import { ScoringService } from './scoring.service';
import { QuestionsModule } from '../questions/questions.module';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { MatchParticipant } from '../entities/match-participant.entity';
import { Round } from '../entities/round.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Match, MatchParticipant, Round]),
    QuestionsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  providers: [GameGateway, GameService, MatchmakingService, ScoringService],
  exports: [GameService],
})
export class GameModule {}
