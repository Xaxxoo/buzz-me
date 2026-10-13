/** Working title. Change it here and it changes everywhere. */
export const GAME_NAME = 'Quad';

/** Toss-ups in a match against a rival school. */
export const ROUNDS = 8;
/** Questions in the daily challenge. */
export const DAILY = 10;
/** Time to buzz after the whole question has been read, in ms. */
export const OPEN_MS = 4500;
/** localStorage key for saved progress. */
export const SAVE_KEY = 'quad.v1';

/** Backend REST API base. */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api/v1';
/** Backend WebSocket URL. */
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
/** localStorage key for the refresh token. */
export const REFRESH_KEY = 'quad.refresh';
/** localStorage key for the access token (used for hydration only). */
export const TOKEN_KEY = 'quad.token';
