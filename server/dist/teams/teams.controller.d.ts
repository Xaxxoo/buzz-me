import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
export declare class TeamsController {
    private readonly service;
    constructor(service: TeamsService);
    create(userId: string, dto: CreateTeamDto): Promise<import("../entities").Team>;
    findOne(id: string): Promise<import("../entities").Team>;
    join(userId: string, inviteCode: string): Promise<import("../entities").Team>;
    removeMember(userId: string, teamId: string, memberId: string): Promise<{
        removed: boolean;
    }>;
}
