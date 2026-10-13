import { Team } from './team.entity';
import { User } from './user.entity';
export declare class TeamMember {
    team_id: string;
    user_id: string;
    team: Team;
    user: User;
    role: 'captain' | 'member';
    joined_at: Date;
}
