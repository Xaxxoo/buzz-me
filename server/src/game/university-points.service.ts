import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { University } from '../entities/university.entity';
import { UniversityDailyPoints } from '../entities/university-daily-points.entity';

const DAILY_CAP = 15; // max points a single player can contribute per day

@Injectable()
export class UniversityPointsService {
  private readonly logger = new Logger(UniversityPointsService.name);

  constructor(
    @InjectRepository(University) private uniRepo: Repository<University>,
    @InjectRepository(UniversityDailyPoints) private dailyRepo: Repository<UniversityDailyPoints>,
  ) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Award points to a university after a ranked match. Verified players earn more. Enforces daily cap. */
  async awardMatchPoints(userId: string, universityId: string | null, verified: boolean, won: boolean) {
    if (!universityId) return;
    const pts = verified ? (won ? 3 : 1) : (won ? 2 : 1);
    const awarded = await this.awardWithCap(userId, universityId, pts);
    if (awarded > 0) {
      this.logger.log(`Awarded ${awarded} match pts to university ${universityId} (user ${userId}, ${won ? 'win' : 'loss'})`);
    }
  }

  /** Award points to a university after a challenge match. */
  async awardChallengePoints(universityId: string, won: boolean) {
    const pts = won ? 25 : 10;
    await this.uniRepo.increment({ id: universityId }, 'points', pts);
    this.logger.log(`Awarded ${pts} challenge pts to university ${universityId} (${won ? 'win' : 'loss'})`);
  }

  /** Award up to `pts` points, respecting the per-player daily cap. Returns actually awarded amount. */
  private async awardWithCap(userId: string, universityId: string, pts: number): Promise<number> {
    const date = this.today();

    let record = await this.dailyRepo.findOneBy({ user_id: userId, date });
    if (!record) {
      record = this.dailyRepo.create({ user_id: userId, university_id: universityId, date, points_awarded: 0 });
    }

    const remaining = DAILY_CAP - record.points_awarded;
    if (remaining <= 0) return 0;

    const actual = Math.min(pts, remaining);
    record.points_awarded += actual;
    await this.dailyRepo.save(record);
    await this.uniRepo.increment({ id: universityId }, 'points', actual);
    return actual;
  }
}
