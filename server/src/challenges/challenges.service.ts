import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { randomBytes } from 'crypto';
import { Challenge } from '../entities/challenge.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ChallengeLobbyService } from '../game/challenge-lobby.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';

@Injectable()
export class ChallengesService implements OnModuleInit {
  private readonly logger = new Logger(ChallengesService.name);
  /** Tracks which reminders have already been sent: "challengeId:window" */
  private sentReminders = new Set<string>();

  constructor(
    @InjectRepository(Challenge) private challengeRepo: Repository<Challenge>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private notificationsService: NotificationsService,
    private challengeLobbyService: ChallengeLobbyService,
  ) {}

  onModuleInit() {
    // Expire stale challenges and check upcoming ones every 60s
    setInterval(() => this.expireStale(), 60_000);
    setInterval(() => this.checkUpcoming(), 60_000);
  }

  async create(userId: string, dto: CreateChallengeDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (!user.university_verified || !user.university_id) {
      throw new ForbiddenException('You must be a verified university member to create a challenge');
    }

    const shareCode = randomBytes(6).toString('hex').slice(0, 12).toUpperCase();

    if (dto.guest_university_id && dto.guest_university_id === user.university_id) {
      throw new BadRequestException('You cannot target your own university');
    }

    const challenge = this.challengeRepo.create({
      host_university_id: user.university_id,
      created_by: userId,
      categories: dto.categories || [],
      question_count: dto.question_count || 20,
      team_size: dto.team_size || 1,
      start_at: dto.start_at ? new Date(dto.start_at) : null,
      guest_university_id: dto.guest_university_id || null,
      status: 'open',
      share_code: shareCode,
    });

    return this.challengeRepo.save(challenge);
  }

  async findAll(query: { status?: string; page?: number; limit?: number; university_id?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.university_id) {
      // Show challenges targeting this university, or open (no target)
      where.guest_university_id = query.university_id;
    }

    const [items, total] = await this.challengeRepo.findAndCount({
      where,
      relations: ['host_university', 'guest_university', 'creator'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return items;
  }

  async findOne(id: string) {
    const challenge = await this.challengeRepo.findOne({
      where: { id },
      relations: ['host_university', 'guest_university', 'creator'],
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }

  async findByCode(shareCode: string) {
    const challenge = await this.challengeRepo.findOne({
      where: { share_code: shareCode },
      relations: ['host_university', 'guest_university', 'creator'],
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }

  async accept(userId: string, challengeId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (!user.university_verified || !user.university_id) {
      throw new ForbiddenException('You must be a verified university member to accept a challenge');
    }

    const challenge = await this.findOne(challengeId);
    if (challenge.status !== 'open') {
      throw new BadRequestException('Challenge is no longer open');
    }
    if (challenge.host_university_id === user.university_id) {
      throw new BadRequestException('You cannot accept your own university\'s challenge');
    }
    if (challenge.guest_university_id && challenge.guest_university_id !== user.university_id) {
      throw new BadRequestException('This challenge is directed at a different university');
    }

    challenge.guest_university_id = user.university_id;
    challenge.status = 'accepted';
    const saved = await this.challengeRepo.save(challenge);

    // Notify the creator
    await this.notificationsService.send(
      challenge.created_by,
      'challenge_accepted',
      'Challenge accepted!',
      `${user.username} from ${user.university_id ? 'another university' : 'your university'} accepted your challenge.`,
      { challenge_id: challengeId },
    );

    // Re-fetch with relations
    return this.findOne(saved.id);
  }

  async cancel(userId: string, challengeId: string) {
    const challenge = await this.findOne(challengeId);
    if (challenge.created_by !== userId) {
      throw new ForbiddenException('Only the creator can cancel a challenge');
    }
    if (challenge.status !== 'open' && challenge.status !== 'accepted') {
      throw new BadRequestException('Challenge cannot be cancelled in its current state');
    }
    challenge.status = 'cancelled';
    return this.challengeRepo.save(challenge);
  }

  async reschedule(userId: string, challengeId: string, newStartAt: string) {
    const challenge = await this.findOne(challengeId);
    if (challenge.created_by !== userId) {
      throw new ForbiddenException('Only the creator can reschedule a challenge');
    }
    if (challenge.status !== 'expired' && challenge.status !== 'cancelled') {
      throw new BadRequestException('Only expired or cancelled challenges can be rescheduled');
    }
    const startAt = new Date(newStartAt);
    if (startAt.getTime() <= Date.now()) {
      throw new BadRequestException('New start time must be in the future');
    }
    challenge.start_at = startAt;
    challenge.status = 'open';
    challenge.guest_university_id = null;

    // Clear stale reminder tracking so new reminders fire
    this.sentReminders.delete(`${challengeId}:24h`);
    this.sentReminders.delete(`${challengeId}:15m`);

    return this.challengeRepo.save(challenge);
  }

  /** Mark the challenge as in-lobby. */
  async setLobby(challengeId: string) {
    await this.challengeRepo.update(challengeId, { status: 'lobby' });
  }

  /** Mark the challenge as live (match in progress). */
  async setLive(challengeId: string) {
    await this.challengeRepo.update(challengeId, { status: 'live' });
  }

  /** Mark the challenge as completed. */
  async setCompleted(challengeId: string) {
    await this.challengeRepo.update(challengeId, { status: 'completed' });
  }

  private async expireStale() {
    const result = await this.challengeRepo
      .createQueryBuilder()
      .update(Challenge)
      .set({ status: 'expired' })
      .where('status = :status AND start_at IS NOT NULL AND start_at < :now', {
        status: 'open',
        now: new Date(),
      })
      .execute();
    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} stale challenges`);
    }
  }

  private async checkUpcoming() {
    const now = Date.now();
    const upcoming = await this.challengeRepo.find({
      where: { status: 'accepted' },
      relations: ['host_university', 'guest_university'],
    });

    for (const ch of upcoming) {
      if (!ch.start_at) continue;
      const startTime = new Date(ch.start_at).getTime();
      const delta = startTime - now;

      // Determine which reminder window we're in
      let window: '24h' | '15m' | null = null;
      if (delta > 23 * 60 * 60_000 && delta <= 25 * 60 * 60_000) window = '24h';
      else if (delta > 14 * 60_000 && delta <= 16 * 60_000) window = '15m';
      if (!window) continue;

      const key = `${ch.id}:${window}`;
      if (this.sentReminders.has(key)) continue;
      this.sentReminders.add(key);

      const title = window === '24h' ? 'Challenge tomorrow' : 'Challenge starting soon';
      const body = window === '24h'
        ? `Your challenge starts in about 24 hours.`
        : `Your challenge starts in about 15 minutes.`;

      // Collect all user IDs to notify: creator + lobby members
      const userIds = new Set<string>([ch.created_by]);
      const lobby = this.challengeLobbyService.getLobby(ch.id);
      if (lobby) {
        for (const p of [...lobby.hostPlayers, ...lobby.guestPlayers]) {
          userIds.add(p.userId);
        }
      }

      for (const userId of userIds) {
        await this.notificationsService.send(userId, 'challenge_starting', title, body, { challenge_id: ch.id });
      }
      this.logger.log(`Sent ${window} reminder for challenge ${ch.id} to ${userIds.size} user(s)`);
    }
  }
}
