import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { University } from '../entities/university.entity';
import { SearchUniversityDto } from './dto/search-university.dto';

@Injectable()
export class UniversitiesService {
  constructor(
    @InjectRepository(University) private repo: Repository<University>,
  ) {}

  async findAll(dto: SearchUniversityDto) {
    const { page = 1, limit = 20, q, country } = dto;
    const where: any = {};

    if (q) where.name = ILike(`%${q}%`);
    if (country) where.country = country;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const uni = await this.repo.findOneBy({ id });
    if (!uni) throw new NotFoundException('University not found');
    return uni;
  }
}
