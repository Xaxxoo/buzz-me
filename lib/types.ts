export type Pattern = 'chief' | 'chevron' | 'bend' | 'sun' | 'bars' | 'split' | 'quarter' | 'cross';
export type Team = 'you' | 'rival';

export interface School {
  id: string;
  name: string;
  country: string;
  short: string;
  /** main crest colour */
  a: string;
  /** second crest colour */
  b: string;
  pat: Pattern;
}

export interface TeamMemberData {
  userId: string;
  username: string;
  rating: number;
  role: 'captain' | 'member';
}

export interface TeamData {
  id: string;
  name: string;
  invite_code: string;
  captain_id: string;
  university_id: string | null;
  members: TeamMemberData[];
}

export interface LobbyMemberState {
  userId: string;
  username: string;
  rating: number;
  ready: boolean;
  isCaptain: boolean;
}

export interface LobbyState {
  teamId: string;
  teamName: string;
  inviteCode: string;
  members: LobbyMemberState[];
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface ChallengeData {
  id: string;
  host_university_id: string;
  guest_university_id: string | null;
  created_by: string;
  start_at: string | null;
  categories: string[];
  question_count: number;
  team_size: number;
  status: string;
  share_code: string;
  created_at: string;
  host_university?: { id: string; name: string; short_name: string; color_a: string; color_b: string; pattern: string };
  guest_university?: { id: string; name: string; short_name: string; color_a: string; color_b: string; pattern: string } | null;
  creator?: { id: string; username: string };
}

export interface ChallengeLobbyState {
  challengeId: string;
  hostUniName: string;
  guestUniName: string;
  teamSize: number;
  hostPlayers: { userId: string; username: string; rating: number; ready: boolean }[];
  guestPlayers: { userId: string; username: string; rating: number; ready: boolean }[];
  hostReady: boolean;
  guestReady: boolean;
}

export interface UniversityProfileData {
  id: string;
  name: string;
  short_name: string;
  country: string;
  color_a: string;
  color_b: string;
  pattern: string;
  points: number;
  rank: number;
  player_count: number;
  avg_rating: number;
  total_wins: number;
  total_losses: number;
  top_players: { id: string; username: string; rating: number; matches_played: number; matches_won: number }[];
  recent_challenges: ChallengeData[];
  upcoming_challenges: ChallengeData[];
}

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
}

/** A question and its options. The first option is always the right one. */
export interface QA {
  t: string;
  o: string[];
}

export interface Question extends QA {
  /** category */
  c: string;
  /** bonus question, asked to whoever wins the toss-up */
  b: QA;
}
