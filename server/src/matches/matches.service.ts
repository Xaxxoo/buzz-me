import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';
import { MatchParticipant } from '../entities/match-participant.entity';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(MatchParticipant) private participantRepo: Repository<MatchParticipant>,
  ) {}

  async getHistory(userId: string, page = 1, limit = 20) {
    const qb = this.matchRepo
      .createQueryBuilder('m')
      .innerJoin('m.participants', 'mp', 'mp.user_id = :userId', { userId })
      .leftJoinAndSelect('m.participants', 'p')
      .leftJoinAndSelect('p.user', 'u')
      .where('m.status = :status', { status: 'completed' })
      .orderBy('m.ended_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getDetail(matchId: string) {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['participants', 'participants.user', 'rounds', 'rounds.question'],
    });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }
}
