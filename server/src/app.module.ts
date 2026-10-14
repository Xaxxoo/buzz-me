import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UniversitiesModule } from './universities/universities.module';
import { CategoriesModule } from './categories/categories.module';
import { QuestionsModule } from './questions/questions.module';
import { MatchesModule } from './matches/matches.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { TeamsModule } from './teams/teams.module';
import { GameModule } from './game/game.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChallengesModule } from './challenges/challenges.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: true, // disable in production
      }),
    }),
    AuthModule,
    UsersModule,
    UniversitiesModule,
    CategoriesModule,
    QuestionsModule,
    MatchesModule,
    LeaderboardsModule,
    TeamsModule,
    GameModule,
    NotificationsModule,
    ChallengesModule,
    ReportsModule,
  ],
})
export class AppModule {}
