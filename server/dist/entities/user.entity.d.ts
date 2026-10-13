import { University } from './university.entity';
import { DeviceSession } from './device-session.entity';
export declare class User {
    id: string;
    username: string;
    username_lower: string;
    email: string;
    password_hash: string;
    rating: number;
    xp: number;
    matches_played: number;
    matches_won: number;
    matches_lost: number;
    matches_drawn: number;
    university_id: string | null;
    university: University;
    university_verified: boolean;
    category_stats: Record<string, [number, number]>;
    save_data: Record<string, any> | null;
    sessions: DeviceSession[];
    created_at: Date;
    updated_at: Date;
}
