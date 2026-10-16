import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampusController } from './campus.controller';
import { CampusService } from './campus.service';
import { Campus } from '../entities/campus.entity';
import { CampusLandmark } from '../entities/campus-landmark.entity';
import { University } from '../entities/university.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Campus, CampusLandmark, University])],
  controllers: [CampusController],
  providers: [CampusService],
  exports: [CampusService],
})
export class CampusModule {}
