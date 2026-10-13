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
