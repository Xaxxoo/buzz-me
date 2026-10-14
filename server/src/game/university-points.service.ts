import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { University } from '../entities/university.entity';

@Injectable()
export class UniversityPointsService {
  private readonly logger = new Logger(UniversityPointsService.name);

  constructor(
    @InjectRepository(University) private uniRepo: Repository<University>,
  ) {}

  /** Award points to a university after a ranked match. Skips unverified players. */
  async awardMatchPoints(userId: string, universityId: string | null, verified: boolean, won: boolean) {
    if (!verified || !universityId) return;
    const pts = won ? 3 : 1;
    await this.uniRepo.increment({ id: universityId }, 'points', pts);
    this.logger.log(`Awarded ${pts} match pts to university ${universityId} (user ${userId}, ${won ? 'win' : 'loss'})`);
  }

  /** Award points to a university after a challenge match. */
  async awardChallengePoints(universityId: string, won: boolean) {
    const pts = won ? 25 : 10;
    await this.uniRepo.increment({ id: universityId }, 'points', pts);
    this.logger.log(`Awarded ${pts} challenge pts to university ${universityId} (${won ? 'win' : 'loss'})`);
  }
}
