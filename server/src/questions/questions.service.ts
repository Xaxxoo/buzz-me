import { Injectable } from '@nestjs/common';
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
    const a = questions.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, DAILY_QUESTIONS);
  }

  /** Random set for matches. */
  async getRandomSet(count: number) {
    const questions = await this.repo.find({
      where: { active: true },
      relations: ['category'],
    });

    // Fisher-Yates shuffle
    const a = questions.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, count);
  }

  async create(dto: any) {
    const question = this.repo.create(dto);
    return this.repo.save(question);
  }
}
