import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSaveDto } from './dto/update-save.dto';
import { LinkUniversityDto } from './dto/link-university.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(userId: string): Promise<{
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
        university: import("../entities").University;
        university_verified: boolean;
        category_stats: Record<string, [number, number]>;
        save_data: Record<string, any> | null;
        sessions: import("../entities").DeviceSession[];
        created_at: Date;
        updated_at: Date;
    }>;
    updateMe(userId: string, dto: UpdateProfileDto): Promise<{
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
        university: import("../entities").University;
        university_verified: boolean;
        category_stats: Record<string, [number, number]>;
        save_data: Record<string, any> | null;
        sessions: import("../entities").DeviceSession[];
        created_at: Date;
        updated_at: Date;
    }>;
    getSave(userId: string): Promise<Record<string, any>>;
    updateSave(userId: string, dto: UpdateSaveDto): Promise<Record<string, any>>;
    getUser(userId: string): Promise<import("../entities").User>;
    linkUniversity(userId: string, dto: LinkUniversityDto): Promise<{
        university_id: string;
        university_verified: boolean;
    }>;
}
