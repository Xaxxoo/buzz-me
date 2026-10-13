import { MatchParticipant } from './match-participant.entity';
import { Round } from './round.entity';
export type MatchType = 'solo' | 'quick' | 'team' | 'challenge';
export type MatchStatus = 'pending' | 'active' | 'completed' | 'abandoned';
export declare class Match {
    id: string;
    type: MatchType;
    ranked: boolean;
    status: MatchStatus;
    started_at: Date | null;
    ended_at: Date | null;
    question_count: number;
    participants: MatchParticipant[];
    rounds: Round[];
    created_at: Date;
}
