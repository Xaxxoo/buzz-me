import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfanityPipe } from '../common/pipes/profanity.pipe';

@Injectable()
export class UsersService {
  private profanity = new ProfanityPipe();

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(University) private universityRepo: Repository<University>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['university'],
    });
    if (!user) throw new NotFoundException('User not found');
    const { password_hash, ...profile } = user;
    return profile;
  }

  async getPublicProfile(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'username', 'rating', 'matches_played', 'matches_won', 'matches_lost', 'matches_drawn', 'university_id'],
      relations: ['university'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    if (dto.username) {
      this.profanity.transform(dto.username);

      // 30-day cooldown
      if (user.last_username_change) {
        const daysSince = (Date.now() - user.last_username_change.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) {
          const daysLeft = Math.ceil(30 - daysSince);
          throw new BadRequestException(`You can change your username again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`);
        }
      }

      const existing = await this.usersRepo.findOneBy({
        username_lower: dto.username.toLowerCase(),
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
      user.username = dto.username;
      user.username_lower = dto.username.toLowerCase();
      user.last_username_change = new Date();
    }

    await this.usersRepo.save(user);
    const { password_hash, ...profile } = user;
    return profile;
  }

  async getSaveData(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'save_data', 'rating', 'matches_played', 'matches_won', 'matches_lost', 'matches_drawn', 'category_stats'],
    });
    if (!user) throw new NotFoundException('User not found');

    // Always overlay authoritative columns on top of save data so the
    // client never sees stale rating / match counts.
    const base = user.save_data || {
      school: null,
      daily: null,
      bestDaily: null,
      streak: { n: 0, last: null, best: 0, freeze: null },
    };

    return {
      ...base,
      rating: user.rating,
      played: user.matches_played,
      won: user.matches_won,
      lost: user.matches_lost,
      drawn: user.matches_drawn,
      cats: user.category_stats || base.cats || {},
    };
  }

  async updateSaveData(userId: string, saveData: Record<string, any>) {
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    // Only store the save blob. Do NOT overwrite authoritative columns
    // (rating, matches_played, matches_won, etc.) — those are updated
    // atomically by the game service after matches and must not be
    // clobbered by potentially stale client data.
    user.save_data = saveData;

    await this.usersRepo.save(user);
    return saveData;
  }

  /** Returns [start, end] for the current calendar quarter. */
  private static currentSeason(): [Date, Date] {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    const end = new Date(now.getFullYear(), quarter * 3 + 3, 1);
    return [start, end];
  }

  async linkUniversity(userId: string, universityId: string) {
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    // Once-per-season limit (skip if setting for the first time)
    if (user.university_id && user.last_university_change) {
      const [seasonStart] = UsersService.currentSeason();
      if (user.last_university_change >= seasonStart) {
        throw new BadRequestException('You can only change your university once per season');
      }
    }

    const university = await this.universityRepo.findOneBy({ id: universityId });
    if (!university) throw new NotFoundException('University not found');

    user.university_id = universityId;
    user.university_verified = false;
    user.last_university_change = new Date();
    await this.usersRepo.save(user);

    return { university_id: universityId, university_verified: false };
  }
}
