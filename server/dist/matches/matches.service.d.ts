import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';
import { MatchParticipant } from '../entities/match-participant.entity';
export declare class MatchesService {
    private matchRepo;
    private participantRepo;
    constructor(matchRepo: Repository<Match>, participantRepo: Repository<MatchParticipant>);
    getHistory(userId: string, page?: number, limit?: number): Promise<{
        items: Match[];
        total: number;
        page: number;
        limit: number;
    }>;
    getDetail(matchId: string): Promise<Match>;
}
