import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campus } from '../entities/campus.entity';
import { CampusLandmark } from '../entities/campus-landmark.entity';

@Injectable()
export class CampusService {
  constructor(
    @InjectRepository(Campus) private campusRepo: Repository<Campus>,
    @InjectRepository(CampusLandmark) private landmarkRepo: Repository<CampusLandmark>,
  ) {}

  async findAll() {
    return this.campusRepo.find({
      where: { active: true },
      relations: ['university'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const campus = await this.campusRepo.findOne({
      where: { id },
      relations: ['university', 'landmarks'],
    });
    if (!campus) throw new NotFoundException('Campus not found');
    return campus;
  }

  async create(data: {
    name: string;
    university_id?: string | null;
    layout?: Record<string, any>;
    asset_url?: string | null;
    fallback_image_url?: string | null;
    osm_attribution?: string | null;
    active?: boolean;
  }) {
    const campus = this.campusRepo.create(data);
    return this.campusRepo.save(campus);
  }

  async update(id: string, data: Partial<{
    name: string;
    university_id: string | null;
    layout: Record<string, any>;
    asset_url: string | null;
    fallback_image_url: string | null;
    osm_attribution: string | null;
    active: boolean;
  }>) {
    const campus = await this.campusRepo.findOneBy({ id });
    if (!campus) throw new NotFoundException('Campus not found');
    Object.assign(campus, data);
    return this.campusRepo.save(campus);
  }

  async remove(id: string) {
    const campus = await this.campusRepo.findOneBy({ id });
    if (!campus) throw new NotFoundException('Campus not found');
    campus.active = false;
    return this.campusRepo.save(campus);
  }

  async findLandmarks(campusId: string) {
    return this.landmarkRepo.find({
      where: { campus_id: campusId },
      order: { key: 'ASC' },
    });
  }

  async createLandmark(campusId: string, data: {
    key: string;
    name: string;
    description?: string | null;
    position_x?: number;
    position_y?: number;
    challenge_question_count?: number;
  }) {
    const campus = await this.campusRepo.findOneBy({ id: campusId });
    if (!campus) throw new NotFoundException('Campus not found');
    const landmark = this.landmarkRepo.create({ ...data, campus_id: campusId });
    return this.landmarkRepo.save(landmark);
  }

  async updateLandmark(id: string, data: Partial<{
    key: string;
    name: string;
    description: string | null;
    position_x: number;
    position_y: number;
    challenge_question_count: number;
  }>) {
    const landmark = await this.landmarkRepo.findOneBy({ id });
    if (!landmark) throw new NotFoundException('Landmark not found');
    Object.assign(landmark, data);
    return this.landmarkRepo.save(landmark);
  }

  async removeLandmark(id: string) {
    const landmark = await this.landmarkRepo.findOneBy({ id });
    if (!landmark) throw new NotFoundException('Landmark not found');
    await this.landmarkRepo.remove(landmark);
  }
}
