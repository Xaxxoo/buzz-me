import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { University } from '../entities/university.entity';
import { User } from '../entities/user.entity';
import { Challenge } from '../entities/challenge.entity';
import { SearchUniversityDto } from './dto/search-university.dto';

@Injectable()
export class UniversitiesService {
  constructor(
    @InjectRepository(University) private repo: Repository<University>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Challenge) private challengeRepo: Repository<Challenge>,
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

  async create(data: {
    name: string;
    short_name: string;
    country: string;
    email_domains?: string[];
    color_a: string;
    color_b: string;
    pattern: string;
  }) {
    const uni = this.repo.create(data);
    return this.repo.save(uni);
  }

  async update(id: string, data: Partial<{
    name: string;
    short_name: string;
    country: string;
    email_domains: string[];
    color_a: string;
    color_b: string;
    pattern: string;
    logo_url: string;
  }>) {
    const uni = await this.repo.findOneBy({ id });
    if (!uni) throw new NotFoundException('University not found');
    Object.assign(uni, data);
    return this.repo.save(uni);
  }

  async remove(id: string) {
    const uni = await this.repo.findOneBy({ id });
    if (!uni) throw new NotFoundException('University not found');
    await this.repo.remove(uni);
  }

  /** University public profile with top players, recent challenges, and stats. */
  async getProfile(id: string) {
    const uni = await this.repo.findOneBy({ id });
    if (!uni) throw new NotFoundException('University not found');

    // Top 5 players by rating
    const topPlayers = await this.userRepo.find({
      where: { university_id: id, university_verified: true },
      order: { rating: 'DESC' },
      take: 5,
      select: ['id', 'username', 'rating', 'matches_played', 'matches_won'],
    });

    // Player stats
    const playerCount = await this.userRepo.count({ where: { university_id: id, university_verified: true } });
    const allPlayers = await this.userRepo.find({
      where: { university_id: id, university_verified: true },
      select: ['rating', 'matches_won', 'matches_lost', 'matches_drawn'],
    });
    const avgRating = allPlayers.length > 0
      ? Math.round(allPlayers.reduce((s, p) => s + p.rating, 0) / allPlayers.length)
      : 1000;
    const totalWins = allPlayers.reduce((s, p) => s + p.matches_won, 0);
    const totalLosses = allPlayers.reduce((s, p) => s + p.matches_lost, 0);

    // Recent completed challenges involving this university (last 10)
    const recentChallenges = await this.challengeRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.host_university', 'host')
      .leftJoinAndSelect('c.guest_university', 'guest')
      .where('(c.host_university_id = :id OR c.guest_university_id = :id)', { id })
      .andWhere('c.status = :status', { status: 'completed' })
      .orderBy('c.updated_at', 'DESC')
      .take(10)
      .getMany();

    // Upcoming challenges
    const upcomingChallenges = await this.challengeRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.host_university', 'host')
      .leftJoinAndSelect('c.guest_university', 'guest')
      .where('(c.host_university_id = :id OR c.guest_university_id = :id)', { id })
      .andWhere('c.status IN (:...statuses)', { statuses: ['open', 'accepted'] })
      .orderBy('c.start_at', 'ASC')
      .take(5)
      .getMany();

    // University rank (count universities with more points)
    const rank = await this.repo
      .createQueryBuilder('u')
      .where('u.points > :pts', { pts: uni.points })
      .getCount() + 1;

    return {
      ...uni,
      rank,
      player_count: playerCount,
      avg_rating: avgRating,
      total_wins: totalWins,
      total_losses: totalLosses,
      top_players: topPlayers,
      recent_challenges: recentChallenges,
      upcoming_challenges: upcomingChallenges,
    };
  }
}
