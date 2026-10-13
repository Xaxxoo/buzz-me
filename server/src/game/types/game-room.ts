import { Socket } from 'socket.io';

export interface PlayerSlot {
  userId: string;
  username: string;
  rating: number;
  universityId: string | null;
  socket: Socket | null;  // null when disconnected
  score: number;
  side: 'a' | 'b';
  connected: boolean;
  disconnectedAt: number | null;
  rtt: number; // round-trip time in ms
}

export interface BotSlot {
  isBot: true;
  username: string;
  rating: number;
  score: number;
  side: 'b';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface RoomQuestion {
  id: string;
  categoryId: string;
  categoryName: string;
  text: string;
  words: string[];
  options: string[];  // first is always correct
  correctIndex: number;
  bonusText: string | null;
  bonusOptions: string[] | null;
}

export type RoomPhase =
  | 'countdown'
  | 'reading'
  | 'buzz_open'
  | 'answering'
  | 'rebound'
  | 'bonus'
  | 'round_end'
  | 'finished';

export interface GameRoom {
  id: string;
  type: 'solo' | 'quick';
  ranked: boolean;
  playerA: PlayerSlot;
  playerB: PlayerSlot | BotSlot;
  questions: RoomQuestion[];
  currentRound: number;
  phase: RoomPhase;
  epoch: number; // bumped on phase change to cancel stale timers
  buzzedSide: 'a' | 'b' | null;
  buzzedEarly: boolean;
  wordIndex: number;
  answeredCorrectly: boolean | null;
  answeredOption: string | null;
  createdAt: number;
}

export function isBot(slot: PlayerSlot | BotSlot): slot is BotSlot {
  return 'isBot' in slot && slot.isBot;
}
