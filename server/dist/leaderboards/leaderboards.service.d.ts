import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
export declare class LeaderboardsService {
    private userRepo;
    private universityRepo;
    private playerCache;
    private universityCache;
    private readonly CACHE_TTL;
    constructor(userRepo: Repository<User>, universityRepo: Repository<University>);
    getPlayerBoard(dto: LeaderboardQueryDto): Promise<{
        items: {
            rank: number;
            id: string;
            username: string;
            rating: number;
            matches_played: number;
            matches_won: number;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getOwnRank(userId: string): Promise<{
        rank: null;
        rating: number;
        matches_played: number;
    } | {
        rank: number;
        rating: number;
        matches_played: number;
    }>;
    getUniversityBoard(dto: LeaderboardQueryDto): Promise<{
        items: {
            id: string;
            name: string;
            short_name: string;
            country: string;
            email_domains: string[];
            points: number;
            logo_url: string;
            color_a: string;
            color_b: string;
            pattern: string;
            created_at: Date;
            rank: number;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    invalidateCache(): void;
}
