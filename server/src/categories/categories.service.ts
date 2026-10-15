import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAllWithCounts(includeInactive = false) {
    const qb = this.repo.createQueryBuilder('c')
      .leftJoin('c.questions', 'q', 'q.active = :active', { active: true })
      .select(['c.id AS id', 'c.name AS name', 'c.slug AS slug', 'c.active AS active', 'COUNT(q.id) AS count']);

    if (!includeInactive) qb.where('c.active = :cActive', { cActive: true });

    const rows = await qb
      .groupBy('c.id')
      .addGroupBy('c.name')
      .addGroupBy('c.slug')
      .addGroupBy('c.active')
      .orderBy('c.name', 'ASC')
      .getRawMany();

    return rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, active: r.active, count: parseInt(r.count, 10) }));
  }

  async create(data: { name: string; slug: string }) {
    const category = this.repo.create(data);
    return this.repo.save(category);
  }

  async update(id: string, data: { name?: string; slug?: string; active?: boolean }) {
    const category = await this.repo.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');
    Object.assign(category, data);
    return this.repo.save(category);
  }

  async remove(id: string) {
    const category = await this.repo.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');
    category.active = false;
    return this.repo.save(category);
  }
}
