import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversitiesController } from './universities.controller';
import { UniversitiesService } from './universities.service';
import { University } from '../entities/university.entity';
import { User } from '../entities/user.entity';
import { Challenge } from '../entities/challenge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([University, User, Challenge])],
  controllers: [UniversitiesController],
  providers: [UniversitiesService],
  exports: [UniversitiesService],
})
export class UniversitiesModule {}
