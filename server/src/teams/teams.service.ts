import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
  ) {}

  async create(userId: string, dto: CreateTeamDto) {
    const inviteCode = randomBytes(6).toString('hex').slice(0, 12).toUpperCase();

    const team = this.teamRepo.create({
      name: dto.name,
      captain_id: userId,
      university_id: dto.university_id || null,
      invite_code: inviteCode,
    });
    await this.teamRepo.save(team);

    const member = this.memberRepo.create({
      team_id: team.id,
      user_id: userId,
      role: 'captain',
    });
    await this.memberRepo.save(member);

    return team;
  }

  async findByUser(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { user_id: userId },
      relations: ['team', 'team.members', 'team.members.user', 'team.university', 'team.captain'],
    });
    return memberships.map(m => m.team);
  }

  async findOne(teamId: string) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members', 'members.user', 'university', 'captain'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async joinByInvite(userId: string, inviteCode: string) {
    const team = await this.teamRepo.findOne({
      where: { invite_code: inviteCode.toUpperCase() },
      relations: ['members'],
    });
    if (!team) throw new NotFoundException('Invalid invite code');

    if (team.members.length >= 3) throw new ConflictException('Team is full (max 3)');

    const existing = team.members?.find((m) => m.user_id === userId);
    if (existing) throw new ConflictException('Already a member');

    const member = this.memberRepo.create({
      team_id: team.id,
      user_id: userId,
      role: 'member',
    });
    await this.memberRepo.save(member);

    return this.findOne(team.id);
  }

  async removeMember(teamId: string, memberId: string, requesterId: string) {
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException('Team not found');
    if (team.captain_id !== requesterId && memberId !== requesterId) {
      throw new ForbiddenException('Only captain can remove members');
    }

    const result = await this.memberRepo.delete({ team_id: teamId, user_id: memberId });
    if (!result.affected) throw new NotFoundException('Member not found');

    return { removed: true };
  }

  async regenerateInviteCode(teamId: string, requesterId: string) {
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException('Team not found');
    if (team.captain_id !== requesterId) {
      throw new ForbiddenException('Only captain can regenerate invite code');
    }

    team.invite_code = randomBytes(6).toString('hex').slice(0, 12).toUpperCase();
    await this.teamRepo.save(team);
    return { invite_code: team.invite_code };
  }

  async transferCaptaincy(teamId: string, newCaptainId: string, requesterId: string) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members'],
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.captain_id !== requesterId) {
      throw new ForbiddenException('Only captain can transfer captaincy');
    }

    const isMember = team.members.some(m => m.user_id === newCaptainId);
    if (!isMember) throw new BadRequestException('Target user is not a team member');

    // Update roles
    await this.memberRepo.update(
      { team_id: teamId, user_id: requesterId },
      { role: 'member' },
    );
    await this.memberRepo.update(
      { team_id: teamId, user_id: newCaptainId },
      { role: 'captain' },
    );
    team.captain_id = newCaptainId;
    await this.teamRepo.save(team);

    return this.findOne(teamId);
  }
}
