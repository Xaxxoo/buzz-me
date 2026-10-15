import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThanOrEqual } from 'typeorm';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { Question } from '../entities/question.entity';
import { Category } from '../entities/category.entity';
import { Report } from '../entities/report.entity';
import { University } from '../entities/university.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(University) private universityRepo: Repository<University>,
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
}
