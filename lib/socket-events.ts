/** Client→Server events (mirrors server/src/game/types/game-events.ts) */
export interface ClientToServerEvents {
  'match:find': (data: { categories?: string[] }) => void;
  'match:cancel_find': () => void;
  'match:solo': (data: { categories?: string[] }) => void;
  'match:buzz': (data: { timestamp: number }) => void;
  'match:answer': (data: { option_index: number }) => void;
  'match:reconnect': (data: { match_id: string }) => void;
}

export interface OpponentInfo {
  id: string;
  username: string;
  rating: number;
  university?: { name: string; short_name: string; color_a: string; color_b: string; pattern: string };
}

export interface MatchEndData {
  match_id: string;
  score_a: number;
  score_b: number;
  rating_before: number;
  rating_after: number;
  rating_delta: number;
  opponent_rating_before: number;
  rounds_won: number;
  total_rounds: number;
}

/** Server→Client events */
export interface ServerToClientEvents {
  'match:found': (data: { match_id: string; opponent: OpponentInfo; you_side: string }) => void;
  'match:countdown': (data: { seconds: number }) => void;
  'match:question': (data: { round: number; total: number; category: string }) => void;
  'match:word': (data: { word: string; index: number; total: number }) => void;
  'match:buzz_open': (data: { duration_ms: number }) => void;
  'match:buzzed': (data: { side: string; username: string }) => void;
  'match:ask': (data: { options: string[]; seconds: number; struck?: string }) => void;
  'match:answer_result': (data: { correct: boolean; correct_answer: string; points: number; score_a: number; score_b: number }) => void;
  'match:rebound': (data: { options: string[]; seconds: number; struck: string }) => void;
  'match:bonus': (data: { text: string; options: string[]; seconds: number; for_side: string }) => void;
  'match:bonus_result': (data: { correct: boolean; correct_answer: string; points: number; score_a: number; score_b: number }) => void;
  'match:round_end': (data: { round: number; score_a: number; score_b: number; took: string }) => void;
  'match:end': (data: MatchEndData) => void;
  'match:opponent_disconnected': () => void;
  'match:opponent_reconnected': () => void;
  'match:opponent_forfeited': () => void;
  'matchmaking:status': (data: { position: number; elapsed_ms: number }) => void;
  'matchmaking:timeout': (data: { offer_bot: boolean }) => void;
  'error': (data: { message: string }) => void;
}
