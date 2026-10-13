import { User } from './user.entity';
import { University } from './university.entity';
import { TeamMember } from './team-member.entity';
export declare class Team {
    id: string;
    name: string;
    captain_id: string;
    captain: User;
    university_id: string | null;
    university: University;
    invite_code: string;
    members: TeamMember[];
    created_at: Date;
    updated_at: Date;
}
