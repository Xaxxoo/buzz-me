import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from '../entities/challenge.entity';
import { User } from '../entities/user.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { GameModule } from '../game/game.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Challenge, User]),
    NotificationsModule,
    forwardRef(() => GameModule),
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
