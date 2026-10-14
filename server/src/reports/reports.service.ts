import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private repo: Repository<Report>,
  ) {}

  async create(reporterId: string, dto: CreateReportDto) {
    const report = this.repo.create({
      reporter_id: reporterId,
      subject_type: dto.subject_type,
      subject_id: dto.subject_id,
      reason: dto.reason,
      description: dto.description ?? null,
    });
    return this.repo.save(report);
  }

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.repo.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['reporter'],
    });
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['reporter'] });
  }

  async updateStatus(id: string, status: 'reviewed' | 'resolved' | 'dismissed') {
    await this.repo.update(id, { status });
  }
}
