import {
  Injectable, UnauthorizedException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../entities/user.entity';
import { DeviceSession } from '../entities/device-session.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ProfanityPipe } from '../common/pipes/profanity.pipe';

@Injectable()
export class AuthService {
  private profanity = new ProfanityPipe();

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(DeviceSession) private sessionsRepo: Repository<DeviceSession>,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto, deviceName: string) {
    this.profanity.transform(dto.username);

    const existing = await this.usersRepo.findOne({
      where: [
        { username_lower: dto.username.toLowerCase() },
        { email: dto.email.toLowerCase() },
      ],
    });
    if (existing) {
      if (existing.email === dto.email.toLowerCase()) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Username already taken');
    }

    const user = this.usersRepo.create({
      username: dto.username,
      username_lower: dto.username.toLowerCase(),
      email: dto.email.toLowerCase(),
      password_hash: await bcrypt.hash(dto.password, 12),
    });
    await this.usersRepo.save(user);

    return this.createTokenPair(user, deviceName);
  }

  async login(dto: LoginDto, deviceName: string) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createTokenPair(user, deviceName);
  }

  async refresh(refreshToken: string, userId: string) {
    const sessions = await this.sessionsRepo.find({ where: { user_id: userId } });
    let matched: DeviceSession | null = null;

    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refresh_token_hash)) {
        matched = session;
        break;
      }
    }

    if (!matched) {
      // Possible token theft — revoke all sessions
      await this.sessionsRepo.delete({ user_id: userId });
      throw new UnauthorizedException('Refresh token invalid. All sessions revoked.');
    }

    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException('User not found');

    // Rotate refresh token
    const newRefreshToken = randomBytes(32).toString('hex');
    matched.refresh_token_hash = await bcrypt.hash(newRefreshToken, 10);
    await this.sessionsRepo.save(matched);

    const accessToken = this.issueAccessToken(user);
    return { access_token: accessToken, refresh_token: newRefreshToken };
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.sessionsRepo.delete({ id: sessionId, user_id: userId });
    } else {
      await this.sessionsRepo.delete({ user_id: userId });
    }
  }

  async getSessions(userId: string) {
    return this.sessionsRepo.find({
      where: { user_id: userId },
      select: ['id', 'device_name', 'last_seen', 'created_at'],
      order: { last_seen: 'DESC' },
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    const result = await this.sessionsRepo.delete({ id: sessionId, user_id: userId });
    if (!result.affected) throw new BadRequestException('Session not found');
  }

  private issueAccessToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });
  }

  private async createTokenPair(user: User, deviceName: string) {
    const accessToken = this.issueAccessToken(user);
    const refreshToken = randomBytes(32).toString('hex');

    const session = this.sessionsRepo.create({
      user_id: user.id,
      refresh_token_hash: await bcrypt.hash(refreshToken, 10),
      device_name: deviceName || 'Unknown device',
    });
    await this.sessionsRepo.save(session);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
      },
    };
  }
}
