import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private repo: Repository<Category>,
  ) {}

  async findAll() {
    return this.repo.find({ where: { active: true }, order: { name: 'ASC' } });
  }

  async findAllWithCounts() {
    const rows = await this.repo.createQueryBuilder('c')
      .leftJoin('c.questions', 'q', 'q.active = :active', { active: true })
      .select(['c.id AS id', 'c.name AS name', 'c.slug AS slug', 'COUNT(q.id) AS count'])
      .where('c.active = :active', { active: true })
      .groupBy('c.id')
      .addGroupBy('c.name')
      .addGroupBy('c.slug')
      .orderBy('c.name', 'ASC')
      .getRawMany();

    return rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, count: parseInt(r.count, 10) }));
  }
}
