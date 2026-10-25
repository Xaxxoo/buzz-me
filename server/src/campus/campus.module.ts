import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampusController } from './campus.controller';
import { CampusPublicController } from './campus-public.controller';
import { CampusService } from './campus.service';
import { Campus } from '../entities/campus.entity';
import { CampusLandmark } from '../entities/campus-landmark.entity';
import { University } from '../entities/university.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Campus, CampusLandmark, University, User])],
  controllers: [CampusController, CampusPublicController],
  providers: [CampusService],
  exports: [CampusService],
})
export class CampusModule {}
