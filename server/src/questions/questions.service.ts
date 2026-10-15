import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { DAILY_QUESTIONS } from '../config/game.config';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private repo: Repository<Question>,
  ) {}

  /** FNV-1a hash — identical to frontend lib/schools.ts hash() */
  private hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Seeded PRNG — identical to frontend lib/save.ts seeded() */
  private seeded(seed: number) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Deterministic daily set — same questions for everyone on a given date. */
  async getDailySet(date: string) {
    const questions = await this.repo.find({
      where: { active: true },
      relations: ['category'],
      order: { id: 'ASC' },
    });

    const r = this.seeded(this.hash('quad ' + date));
    const a = questions.filter((q) => this.isValid(q)).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, DAILY_QUESTIONS);
  }

  /** A valid question needs non-empty text with at least 4 words and at least 2 options. */
  private isValid(q: Question): boolean {
    if (!q.text || q.text.trim().split(/\s+/).length < 4) return false;
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    return true;
  }

  /** Random set for matches. */
  async getRandomSet(count: number) {
    const questions = await this.repo.find({
      where: { active: true },
      relations: ['category'],
    });

    // Filter out malformed questions
    const valid = questions.filter((q) => this.isValid(q));

    // Fisher-Yates shuffle
    const a = valid.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, count);
  }

  /** Random set filtered by category slugs (for the /questions/random endpoint). */
  async getRandomSetByCategories(count: number, categorySlugs: string[]) {
    const qb = this.repo.createQueryBuilder('q')
      .innerJoinAndSelect('q.category', 'c')
      .where('q.active = :active', { active: true });

    if (categorySlugs.length > 0) {
      qb.andWhere('c.slug IN (:...slugs)', { slugs: categorySlugs });
    }

    const questions = await qb.getMany();

    // Filter out malformed questions
    const valid = questions.filter((q) => this.isValid(q));

    // Fisher-Yates shuffle
    const a = valid.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, count);
  }

  /** Admin: paginated list with optional filters. */
  async findAll(opts: { page: number; limit: number; categoryId?: string; difficulty?: string; active?: boolean }) {
    const { page, limit, categoryId, difficulty, active } = opts;
    const where: any = {};
    if (categoryId) where.category_id = categoryId;
    if (difficulty) where.difficulty = difficulty;
    if (active !== undefined) where.active = active;

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: ['category'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const q = await this.repo.findOne({ where: { id }, relations: ['category'] });
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }

  private validateDto(dto: any) {
    if (!dto.text || typeof dto.text !== 'string' || dto.text.trim().split(/\s+/).length < 4) {
      throw new BadRequestException('Question text must contain at least 4 words');
    }
    if (!Array.isArray(dto.options) || dto.options.length < 2) {
      throw new BadRequestException('Question must have at least 2 options');
    }
    if (dto.bonus_text && typeof dto.bonus_text === 'string' && dto.bonus_text.trim().split(/\s+/).length < 4) {
      throw new BadRequestException('Bonus text must contain at least 4 words');
    }
  }

  async create(dto: any) {
    this.validateDto(dto);
    const question = this.repo.create(dto);
    return this.repo.save(question);
  }

  async update(id: string, dto: any) {
    const question = await this.repo.findOneBy({ id });
    if (!question) throw new NotFoundException('Question not found');
    Object.assign(question, dto);
    return this.repo.save(question);
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Question not found');
  }
}
