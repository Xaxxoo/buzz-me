export type LeaderboardScope = 'player' | 'university';
export type LeaderboardPeriod = 'weekly' | 'season' | 'alltime';
export declare class LeaderboardEntry {
    id: string;
    scope: LeaderboardScope;
    period: LeaderboardPeriod;
    subject_id: string;
    score: number;
    rank: number;
    matches_played: number;
    created_at: Date;
    updated_at: Date;
}
