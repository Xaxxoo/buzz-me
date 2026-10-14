/** Client→Server events */
export interface ClientToServerEvents {
  'match:find': (data: { categories?: string[] }) => void;
  'match:cancel_find': () => void;
  'match:solo': (data: { categories?: string[] }) => void;
  'match:buzz': (data: { timestamp: number }) => void;
  'match:answer': (data: { option_index: number }) => void;
  'match:reconnect': (data: { match_id: string }) => void;
  'team:join_lobby': (data: { team_id: string }) => void;
  'team:leave_lobby': (data: { team_id: string }) => void;
  'team:ready': (data: { team_id: string; ready: boolean }) => void;
  'team:start_find': (data: { team_id: string; categories?: string[] }) => void;
  'team:cancel_find': (data: { team_id: string }) => void;
  'team:challenge': (data: { team_id: string; opponent_code: string }) => void;
  'challenge:join_lobby': (data: { challenge_id: string }) => void;
  'challenge:leave_lobby': (data: { challenge_id: string }) => void;
  'challenge:ready': (data: { challenge_id: string; ready: boolean }) => void;
  'challenge:start': (data: { challenge_id: string }) => void;
  'spectate:join': (data: { match_id: string }) => void;
  'spectate:leave': (data: { match_id: string }) => void;
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
  'match:answer_result': (data: {
    correct: boolean; correct_answer: string; points: number;
    score_a: number; score_b: number;
  }) => void;
  'match:rebound': (data: { options: string[]; seconds: number; struck: string }) => void;
  'match:bonus': (data: { text: string; options: string[]; seconds: number; for_side: string }) => void;
  'match:bonus_result': (data: {
    correct: boolean; correct_answer: string; points: number;
    score_a: number; score_b: number;
  }) => void;
  'match:round_end': (data: { round: number; score_a: number; score_b: number; took: string }) => void;
  'match:sudden_death': (data: Record<string, never>) => void;
  'match:end': (data: MatchEndData) => void;
  'match:opponent_disconnected': () => void;
  'match:opponent_reconnected': () => void;
  'match:opponent_forfeited': () => void;
  'match:reconnect_state': (data: { match_id: string; round: number; total: number; score_a: number; score_b: number; phase: string }) => void;
  'matchmaking:status': (data: { position: number; elapsed_ms: number }) => void;
  'matchmaking:timeout': (data: { offer_bot: boolean }) => void;
  'error': (data: { message: string }) => void;
  'notification:new': (data: { id: string; type: string; title: string; body: string; data: Record<string, any>; created_at: Date }) => void;
  'team:lobby_update': (data: TeamLobbyUpdate) => void;
  'team:finding': () => void;
  'team:match_found': (data: { match_id: string; opponent_team: string }) => void;
  'team:match_timeout': () => void;
  'challenge:lobby_update': (data: any) => void;
  'challenge:starting': (data: { challenge_id: string; countdown: number }) => void;
  'challenge:live': (data: { challenge_id: string; match_id: string }) => void;
  'spectate:state': (data: { match_id: string; score_a: number; score_b: number; round: number; total: number; phase: string }) => void;
}

export interface TeamLobbyMemberInfo {
  userId: string;
  username: string;
  rating: number;
  ready: boolean;
  isCaptain: boolean;
}

export interface TeamLobbyUpdate {
  teamId: string;
  teamName: string;
  inviteCode: string;
  members: TeamLobbyMemberInfo[];
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
