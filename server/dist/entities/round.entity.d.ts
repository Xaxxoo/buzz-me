import { Match } from './match.entity';
import { Question } from './question.entity';
export declare class Round {
    id: string;
    match_id: string;
    match: Match;
    question_id: string;
    question: Question;
    round_number: number;
    buzz_user_id: string | null;
    buzz_time_ms: number | null;
    buzz_position: number | null;
    answer_index: number | null;
    correct: boolean | null;
    points_awarded: number;
    rebound_user_id: string | null;
    rebound_answer_index: number | null;
    rebound_correct: boolean | null;
    rebound_points: number;
    bonus_points: number;
}
