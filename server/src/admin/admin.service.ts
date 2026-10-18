import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThanOrEqual } from 'typeorm';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { Question } from '../entities/question.entity';
import { Category } from '../entities/category.entity';
import { Report } from '../entities/report.entity';
import { University } from '../entities/university.entity';
import { MatchParticipant } from '../entities/match-participant.entity';
import { Round } from '../entities/round.entity';
import { DeviceSession } from '../entities/device-session.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(University) private universityRepo: Repository<University>,
    @InjectRepository(MatchParticipant) private participantRepo: Repository<MatchParticipant>,
    @InjectRepository(Round) private roundRepo: Repository<Round>,
    @InjectRepository(DeviceSession) private sessionRepo: Repository<DeviceSession>,
  ) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalMatches, totalQuestions, totalCategories, openReports, totalUniversities] =
      await Promise.all([
        this.userRepo.count(),
        this.matchRepo.count(),
        this.questionRepo.count({ where: { active: true } }),
        this.categoryRepo.count({ where: { active: true } }),
        this.reportRepo.count({ where: { status: 'open' } }),
        this.universityRepo.count(),
      ]);

    const [matchesToday, signupsThisWeek] = await Promise.all([
      this.matchRepo.count({ where: { created_at: MoreThanOrEqual(todayStart) } }),
      this.userRepo.count({ where: { created_at: MoreThanOrEqual(weekAgo) } }),
    ]);

    return {
      totalUsers,
      totalMatches,
      totalQuestions,
      totalCategories,
      openReports,
      totalUniversities,
      matchesToday,
      signupsThisWeek,
    };
  }

  async getActivity(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [signupRows, matchRows] = await Promise.all([
      this.userRepo
        .createQueryBuilder('u')
        .select("DATE(u.created_at)", 'date')
        .addSelect('COUNT(*)::int', 'count')
        .where('u.created_at >= :since', { since })
        .groupBy('DATE(u.created_at)')
        .orderBy('DATE(u.created_at)', 'ASC')
        .getRawMany<{ date: string; count: number }>(),
      this.matchRepo
        .createQueryBuilder('m')
        .select("DATE(m.created_at)", 'date')
        .addSelect('COUNT(*)::int', 'count')
        .where('m.created_at >= :since', { since })
        .groupBy('DATE(m.created_at)')
        .orderBy('DATE(m.created_at)', 'ASC')
        .getRawMany<{ date: string; count: number }>(),
    ]);

    const map: Record<string, { signups: number; matches: number }> = {};
    for (const r of signupRows) {
      const d = String(r.date).slice(0, 10);
      map[d] = { signups: Number(r.count), matches: 0 };
    }
    for (const r of matchRows) {
      const d = String(r.date).slice(0, 10);
      if (!map[d]) map[d] = { signups: 0, matches: 0 };
      map[d].matches = Number(r.count);
    }

    const result: { date: string; signups: number; matches: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, signups: map[key]?.signups ?? 0, matches: map[key]?.matches ?? 0 });
    }
    return result;
  }

  async getUsers(page = 1, limit = 20, q?: string) {
    const where: any = {};
    if (q) where.username = ILike(`%${q}%`);

    const [items, total] = await this.userRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['university'],
      select: [
        'id', 'username', 'email', 'rating', 'xp',
        'matches_played', 'matches_won', 'matches_lost', 'matches_drawn',
        'university_id', 'is_admin', 'created_at',
      ],
    });

    return { items, total, page, limit };
  }

  async getUser(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['university'],
    });
    if (!user) throw new NotFoundException('User not found');
    const { password_hash, ...result } = user;
    return result;
  }

  async updateUser(id: string, data: { is_admin?: boolean; university_id?: string | null }) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    if (data.is_admin !== undefined) user.is_admin = data.is_admin;
    if (data.university_id !== undefined) user.university_id = data.university_id;
    return this.userRepo.save(user);
  }

  async getMatches(page = 1, limit = 20, status?: string, type?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await this.matchRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['participants'],
    });

    return { items, total, page, limit };
  }

  async getMatch(id: string) {
    const match = await this.matchRepo.findOne({
      where: { id },
      relations: ['participants', 'rounds'],
    });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  async getUserStats(id: string) {
    // 1. User with sessions
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['university', 'sessions'],
    });
    if (!user) throw new NotFoundException('User not found');

    const { password_hash, ...safeUser } = user;

    // Run all aggregation queries in parallel
    const [timeStats, answerStats, pointsRow, ratingHistory, recentMatches] = await Promise.all([
      // 2. Time played + avg duration
      this.participantRepo
        .createQueryBuilder('mp')
        .innerJoin('mp.match', 'm')
        .select('COALESCE(SUM(EXTRACT(EPOCH FROM (m.ended_at - m.started_at))), 0)', 'total_time')
        .addSelect('COALESCE(AVG(EXTRACT(EPOCH FROM (m.ended_at - m.started_at))), 0)', 'avg_duration')
        .addSelect('COUNT(*)::int', 'match_count')
        .where('mp.user_id = :id', { id })
        .andWhere('m.status = :status', { status: 'completed' })
        .andWhere('m.ended_at IS NOT NULL')
        .andWhere('m.started_at IS NOT NULL')
        .getRawOne<{ total_time: string; avg_duration: string; match_count: number }>(),

      // 3. Answer stats from rounds
      this.roundRepo
        .createQueryBuilder('r')
        .select('COUNT(*) FILTER (WHERE r.buzz_user_id = :id OR r.rebound_user_id = :id)', 'total_answers')
        .addSelect(
          `COUNT(*) FILTER (WHERE (r.buzz_user_id = :id AND r.correct = true) OR (r.rebound_user_id = :id AND r.rebound_correct = true))`,
          'correct_answers',
        )
        .addSelect('COUNT(*) FILTER (WHERE r.buzz_user_id = :id OR r.rebound_user_id = :id)', 'total_rounds')
        .addSelect('AVG(r.buzz_time_ms) FILTER (WHERE r.buzz_user_id = :id)', 'avg_buzz_speed')
        .addSelect('AVG(r.buzz_position) FILTER (WHERE r.buzz_user_id = :id)', 'avg_buzz_position')
        .addSelect('COUNT(*) FILTER (WHERE r.rebound_user_id = :id)', 'rebounds_attempted')
        .addSelect('COUNT(*) FILTER (WHERE r.rebound_user_id = :id AND r.rebound_correct = true)', 'rebounds_correct')
        .setParameter('id', id)
        .getRawOne<{
          total_answers: string; correct_answers: string; total_rounds: string;
          avg_buzz_speed: string | null; avg_buzz_position: string | null;
          rebounds_attempted: string; rebounds_correct: string;
        }>(),

      // 4. Total points
      this.participantRepo
        .createQueryBuilder('mp')
        .select('COALESCE(SUM(mp.score), 0)', 'total_points')
        .where('mp.user_id = :id', { id })
        .getRawOne<{ total_points: string }>(),

      // 5. Rating history (last 20)
      this.participantRepo
        .createQueryBuilder('mp')
        .innerJoin('mp.match', 'm')
        .select('mp.match_id', 'match_id')
        .addSelect('m.ended_at', 'date')
        .addSelect('mp.rating_before', 'rating_before')
        .addSelect('mp.rating_after', 'rating_after')
        .where('mp.user_id = :id', { id })
        .andWhere('mp.rating_after IS NOT NULL')
        .andWhere('m.status = :status', { status: 'completed' })
        .orderBy('m.ended_at', 'DESC')
        .limit(20)
        .getRawMany<{ match_id: string; date: string; rating_before: number; rating_after: number }>(),

      // 6. Recent matches (last 10) with opponent info
      this.participantRepo
        .createQueryBuilder('mp')
        .innerJoin('mp.match', 'm')
        .leftJoin(
          MatchParticipant, 'opp',
          'opp.match_id = mp.match_id AND opp.user_id != :id',
        )
        .leftJoin(User, 'ou', 'ou.id = opp.user_id')
        .select('m.id', 'id')
        .addSelect('m.type', 'type')
        .addSelect('m.status', 'status')
        .addSelect('mp.score', 'score')
        .addSelect('ou.username', 'opponent_name')
        .addSelect('opp.score', 'opponent_score')
        .addSelect('mp.rating_before', 'rating_before')
        .addSelect('mp.rating_after', 'rating_after')
        .addSelect('m.ended_at', 'date')
        .where('mp.user_id = :id', { id })
        .andWhere('m.status = :status', { status: 'completed' })
        .orderBy('m.ended_at', 'DESC')
        .limit(10)
        .getRawMany<{
          id: string; type: string; status: string; score: number;
          opponent_name: string | null; opponent_score: number | null;
          rating_before: number | null; rating_after: number | null; date: string;
        }>(),
    ]);

    // Parse aggregated values
    const totalTimePlayed = parseFloat(timeStats?.total_time ?? '0');
    const avgMatchDuration = parseFloat(timeStats?.avg_duration ?? '0');
    const totalRounds = parseInt(answerStats?.total_rounds ?? '0', 10);
    const correctAnswers = parseInt(answerStats?.correct_answers ?? '0', 10);
    const totalAnswers = parseInt(answerStats?.total_answers ?? '0', 10);
    const avgBuzzSpeed = answerStats?.avg_buzz_speed ? parseFloat(answerStats.avg_buzz_speed) : null;
    const avgBuzzPosition = answerStats?.avg_buzz_position ? parseFloat(answerStats.avg_buzz_position) : null;
    const totalPointsScored = parseInt(pointsRow?.total_points ?? '0', 10);
    const reboundsAttempted = parseInt(answerStats?.rebounds_attempted ?? '0', 10);
    const reboundsCorrect = parseInt(answerStats?.rebounds_correct ?? '0', 10);

    // Compute win streaks from recent matches
    const matchResults = recentMatches.map(m => {
      const s = Number(m.score);
      const os = m.opponent_score != null ? Number(m.opponent_score) : null;
      if (os == null) return s > 0 ? 'win' : 'draw';
      if (s > os) return 'win';
      if (s < os) return 'loss';
      return 'draw';
    }) as ('win' | 'loss' | 'draw')[];

    let winStreak = 0;
    for (const r of matchResults) {
      if (r === 'win') winStreak++;
      else break;
    }

    let bestWinStreak = 0;
    let current = 0;
    for (const r of matchResults) {
      if (r === 'win') { current++; bestWinStreak = Math.max(bestWinStreak, current); }
      else current = 0;
    }

    // Category breakdown from user.category_stats
    const categories = Object.entries(safeUser.category_stats || {}).map(([slug, [correct, total]]) => ({
      slug,
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      correct,
      total,
      accuracy: total > 0 ? correct / total : 0,
    })).sort((a, b) => b.total - a.total);

    // Format rating history
    const formattedRatingHistory = ratingHistory.map(r => ({
      match_id: r.match_id,
      date: r.date,
      rating_before: Number(r.rating_before),
      rating_after: Number(r.rating_after),
      delta: Number(r.rating_after) - Number(r.rating_before),
    }));

    // Format recent matches
    const formattedRecentMatches = recentMatches.map((m, i) => ({
      id: m.id,
      type: m.type,
      status: m.status,
      score: Number(m.score),
      opponentName: m.opponent_name,
      opponentScore: m.opponent_score != null ? Number(m.opponent_score) : null,
      result: matchResults[i],
      ratingBefore: m.rating_before != null ? Number(m.rating_before) : null,
      ratingAfter: m.rating_after != null ? Number(m.rating_after) : null,
      date: m.date,
    }));

    // Format sessions
    const sessions = (safeUser.sessions || []).map(s => ({
      id: s.id,
      device_name: s.device_name,
      last_seen: s.last_seen,
      created_at: s.created_at,
    }));

    return {
      user: safeUser,
      stats: {
        totalTimePlayed,
        avgMatchDuration,
        totalRounds,
        correctAnswers,
        totalAnswers,
        accuracy: totalAnswers > 0 ? correctAnswers / totalAnswers : 0,
        avgBuzzSpeed,
        avgBuzzPosition,
        totalPointsScored,
        avgScore: safeUser.matches_played > 0 ? totalPointsScored / safeUser.matches_played : 0,
        reboundsAttempted,
        reboundsCorrect,
        winStreak,
        bestWinStreak,
      },
      categories,
      ratingHistory: formattedRatingHistory,
      recentMatches: formattedRecentMatches,
      sessions,
    };
  }
}
