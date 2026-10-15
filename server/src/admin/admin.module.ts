import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CategoriesModule } from '../categories/categories.module';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { Question } from '../entities/question.entity';
import { Category } from '../entities/category.entity';
import { Report } from '../entities/report.entity';
import { University } from '../entities/university.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Match, Question, Category, Report, University]),
    CategoriesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
