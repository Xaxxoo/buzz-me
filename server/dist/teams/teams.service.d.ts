import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
export declare class TeamsService {
    private teamRepo;
    private memberRepo;
    constructor(teamRepo: Repository<Team>, memberRepo: Repository<TeamMember>);
    create(userId: string, dto: CreateTeamDto): Promise<Team>;
    findOne(teamId: string): Promise<Team>;
    joinByInvite(userId: string, inviteCode: string): Promise<Team>;
    removeMember(teamId: string, memberId: string, requesterId: string): Promise<{
        removed: boolean;
    }>;
}
