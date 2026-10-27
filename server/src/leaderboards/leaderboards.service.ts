import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { MatchParticipant } from '../entities/match-participant.entity';
import { Round } from '../entities/round.entity';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Injectable()
export class LeaderboardsService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(University) private universityRepo: Repository<University>,
    @InjectRepository(MatchParticipant) private participantRepo: Repository<MatchParticipant>,
    @InjectRepository(Round) private roundRepo: Repository<Round>,
  ) {}

  /** Returns [start, end] dates for the current calendar quarter. */
  private static currentSeason(): [Date, Date] {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    const end = new Date(now.getFullYear(), quarter * 3 + 3, 1);
    return [start, end];
  }

  async getPlayerBoard(dto: LeaderboardQueryDto) {
    const { page = 1, limit = 20, university_id, period = 'alltime', category } = dto;

    if (category) {
      return this.getCategoryPlayerBoard(page, limit, category, university_id);
    }

    if (period === 'weekly') {
      return this.getTimeBoundPlayerBoard(page, limit, new Date(Date.now() - 7 * 24 * 60 * 60_000), undefined, university_id);
    }

    if (period === 'season') {
      const [start, end] = LeaderboardsService.currentSeason();
      return this.getTimeBoundPlayerBoard(page, limit, start, end, university_id);
    }

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

  /** Weekly or season player board — filters match_participants by date range. */
  private async getTimeBoundPlayerBoard(page: number, limit: number, start: Date, end?: Date, universityId?: string) {
    let qb = this.participantRepo
      .createQueryBuilder('mp')
      .innerJoin('mp.match', 'm')
      .innerJoin('mp.user', 'u')
      .select('mp.user_id', 'id')
      .addSelect('u.username', 'username')
      .addSelect('u.rating', 'rating')
      .addSelect('COUNT(*)::int', 'matches_played')
      .addSelect('SUM(CASE WHEN mp.rating_after > mp.rating_before THEN 1 ELSE 0 END)::int', 'matches_won')
      .addSelect('COALESCE(SUM(mp.rating_after - mp.rating_before), 0)::int', 'rating_change')
      .where('m.ended_at >= :start', { start })
      .andWhere('m.type != :solo', { solo: 'solo' })
      .groupBy('mp.user_id')
      .addGroupBy('u.username')
      .addGroupBy('u.rating')
      .having('COUNT(*) >= :min', { min: 1 })
      .orderBy('"rating_change"', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    if (end) {
      qb = qb.andWhere('m.ended_at < :end', { end });
    }

    if (universityId) {
      qb = qb.andWhere('u.university_id = :universityId', { universityId });
    }

    const raw = await qb.getRawMany();

    // Count total for pagination
    let countQb = this.participantRepo
      .createQueryBuilder('mp')
      .innerJoin('mp.match', 'm')
      .select('COUNT(DISTINCT mp.user_id)::int', 'total')
      .where('m.ended_at >= :start', { start })
      .andWhere('m.type != :solo', { solo: 'solo' });

    if (end) {
      countQb = countQb.andWhere('m.ended_at < :end', { end });
    }

    if (universityId) {
      countQb = countQb
        .innerJoin('mp.user', 'u')
        .andWhere('u.university_id = :universityId', { universityId });
    }

    const countResult = await countQb.getRawOne();
    const total = countResult?.total ?? 0;

    return {
      items: raw.map((r, i) => ({
        rank: (page - 1) * limit + i + 1,
        id: r.id,
        username: r.username,
        rating: Number(r.rating),
        matches_played: Number(r.matches_played),
        matches_won: Number(r.matches_won),
        rating_change: Number(r.rating_change),
      })),
      total,
      page,
      limit,
    };
  }

  /** Per-category leaderboard: ranks players by accuracy (right / total) in a specific category. */
  private async getCategoryPlayerBoard(page: number, limit: number, categorySlug: string, universityId?: string) {
    // Use rounds → questions → categories join to compute per-category stats
    let qb = this.roundRepo
      .createQueryBuilder('r')
      .innerJoin('r.question', 'q')
      .innerJoin('q.category', 'cat')
      .innerJoin('r.match', 'm')
      .innerJoinAndSelect(User, 'u', 'r.buzz_user_id = u.id')
      .select('r.buzz_user_id', 'id')
      .addSelect('u.username', 'username')
      .addSelect('u.rating', 'rating')
      .addSelect('COUNT(*)::int', 'total_answered')
      .addSelect('SUM(CASE WHEN r.correct = true THEN 1 ELSE 0 END)::int', 'correct_answers')
      .addSelect('ROUND(SUM(CASE WHEN r.correct = true THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100)::int', 'accuracy')
      .where('cat.slug = :categorySlug', { categorySlug })
      .andWhere('r.buzz_user_id IS NOT NULL')
      .andWhere('m.type != :solo', { solo: 'solo' })
      .groupBy('r.buzz_user_id')
      .addGroupBy('u.username')
      .addGroupBy('u.rating')
      .having('COUNT(*) >= :min', { min: 5 })
      .orderBy('"accuracy"', 'DESC')
      .addOrderBy('"correct_answers"', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    if (universityId) {
      qb = qb.andWhere('u.university_id = :universityId', { universityId });
    }

    const raw = await qb.getRawMany();

    // Count total
    let countQb = this.roundRepo
      .createQueryBuilder('r')
      .innerJoin('r.question', 'q')
      .innerJoin('q.category', 'cat')
      .innerJoin('r.match', 'm')
      .select('COUNT(DISTINCT r.buzz_user_id)::int', 'total')
      .where('cat.slug = :categorySlug', { categorySlug })
      .andWhere('r.buzz_user_id IS NOT NULL')
      .andWhere('m.type != :solo', { solo: 'solo' });

    if (universityId) {
      countQb = countQb
        .innerJoin(User, 'u', 'r.buzz_user_id = u.id')
        .andWhere('u.university_id = :universityId', { universityId });
    }

    const countResult = await countQb.getRawOne();
    const total = countResult?.total ?? 0;

    return {
      items: raw.map((r, i) => ({
        rank: (page - 1) * limit + i + 1,
        id: r.id,
        username: r.username,
        rating: Number(r.rating),
        total_answered: Number(r.total_answered),
        correct_answers: Number(r.correct_answers),
        accuracy: Number(r.accuracy),
      })),
      total,
      page,
      limit,
      category: categorySlug,
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

    // Count active universities (with players) via a subquery
    const activeQb = this.universityRepo
      .createQueryBuilder('u')
      .innerJoin(User, 'p', 'p.university_id = u.id')
      .select('u.id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.short_name', 'short_name')
      .addSelect('u.country', 'country')
      .addSelect('u.points', 'points')
      .addSelect('u.color_a', 'color_a')
      .addSelect('u.color_b', 'color_b')
      .addSelect('u.pattern', 'pattern')
      .addSelect('COUNT(p.id)::int', 'player_count')
      .addSelect('COALESCE(SUM(p.matches_won), 0)::int', 'total_wins')
      .groupBy('u.id')
      .addGroupBy('u.name')
      .addGroupBy('u.short_name')
      .addGroupBy('u.country')
      .addGroupBy('u.points')
      .addGroupBy('u.color_a')
      .addGroupBy('u.color_b')
      .addGroupBy('u.pattern')
      .orderBy('u.points', 'DESC')
      .addOrderBy('"total_wins"', 'DESC')
      .addOrderBy('"player_count"', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const raw = await activeQb.getRawMany();

    // Total count of universities that have at least one player
    const countResult = await this.universityRepo
      .createQueryBuilder('u')
      .innerJoin(User, 'p', 'p.university_id = u.id')
      .select('COUNT(DISTINCT u.id)::int', 'total')
      .getRawOne();
    const total = countResult?.total ?? 0;

    return {
      items: raw.map((u, i) => ({
        rank: (page - 1) * limit + i + 1,
        id: u.id,
        name: u.name,
        short_name: u.short_name,
        country: u.country,
        points: Number(u.points),
        color_a: u.color_a,
        color_b: u.color_b,
        pattern: u.pattern,
        player_count: Number(u.player_count),
        total_wins: Number(u.total_wins),
      })),
      total,
      page,
      limit,
    };
  }
}
