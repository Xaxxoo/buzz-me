import { Match } from './match.entity';
import { User } from './user.entity';
export declare class MatchParticipant {
    match_id: string;
    user_id: string;
    match: Match;
    user: User;
    team_side: string | null;
    score: number;
    rating_before: number | null;
    rating_after: number | null;
}
