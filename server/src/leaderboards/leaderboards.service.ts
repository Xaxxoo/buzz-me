import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Injectable()
export class LeaderboardsService {
  private playerCache: { data: any; expires: number } | null = null;
  private universityCache: { data: any; expires: number } | null = null;
  private readonly CACHE_TTL = 60_000; // 60 seconds

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(University) private universityRepo: Repository<University>,
  ) {}

  async getPlayerBoard(dto: LeaderboardQueryDto) {
    const { page = 1, limit = 20, university_id } = dto;

    const qb = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.username', 'u.rating', 'u.matches_played', 'u.matches_won', 'u.university_id'])
      .where('u.matches_played >= :min', { min: 5 })
      .orderBy('u.rating', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (university_id) {
      qb.andWhere('u.university_id = :university_id', { university_id });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((u, i) => ({
        rank: (page - 1) * limit + i + 1,
        id: u.id,
        username: u.username,
        rating: u.rating,
        matches_played: u.matches_played,
        matches_won: u.matches_won,
      })),
      total,
      page,
      limit,
    };
  }

  async getOwnRank(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user || user.matches_played < 5) {
      return { rank: null, rating: user?.rating ?? 1000, matches_played: user?.matches_played ?? 0 };
    }

    const rank = await this.userRepo
      .createQueryBuilder('u')
      .where('u.matches_played >= :min', { min: 5 })
      .andWhere('u.rating > :rating', { rating: user.rating })
      .getCount();

    return { rank: rank + 1, rating: user.rating, matches_played: user.matches_played };
  }

  async getUniversityBoard(dto: LeaderboardQueryDto) {
    const { page = 1, limit = 20 } = dto;

    const qb = this.universityRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.short_name', 'u.country', 'u.points', 'u.color_a', 'u.color_b', 'u.pattern'])
      .orderBy('u.points', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((u, i) => ({
        rank: (page - 1) * limit + i + 1,
        ...u,
      })),
      total,
      page,
      limit,
    };
  }

  invalidateCache() {
    this.playerCache = null;
    this.universityCache = null;
  }
}
