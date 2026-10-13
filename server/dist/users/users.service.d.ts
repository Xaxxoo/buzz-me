import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private usersRepo;
    private universityRepo;
    private profanity;
    constructor(usersRepo: Repository<User>, universityRepo: Repository<University>);
    getProfile(userId: string): Promise<{
        id: string;
        username: string;
        username_lower: string;
        email: string;
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
        sessions: import("../entities").DeviceSession[];
        created_at: Date;
        updated_at: Date;
    }>;
    getPublicProfile(userId: string): Promise<User>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        username: string;
        username_lower: string;
        email: string;
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
        sessions: import("../entities").DeviceSession[];
        created_at: Date;
        updated_at: Date;
    }>;
    getSaveData(userId: string): Promise<Record<string, any>>;
    updateSaveData(userId: string, saveData: Record<string, any>): Promise<Record<string, any>>;
    linkUniversity(userId: string, universityId: string): Promise<{
        university_id: string;
        university_verified: boolean;
    }>;
}
