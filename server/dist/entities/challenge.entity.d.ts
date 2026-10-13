import { University } from './university.entity';
import { User } from './user.entity';
export type ChallengeStatus = 'open' | 'accepted' | 'lobby' | 'live' | 'completed' | 'expired' | 'cancelled';
export declare class Challenge {
    id: string;
    host_university_id: string;
    host_university: University;
    guest_university_id: string | null;
    guest_university: University;
    created_by: string;
    creator: User;
    start_at: Date | null;
    categories: string[];
    question_count: number;
    team_size: number;
    status: ChallengeStatus;
    share_code: string;
    created_at: Date;
    updated_at: Date;
}
