/** Server-side game constants — must match frontend lib/config.ts and lib/engine.ts exactly. */

export const ROUNDS = 8;
export const DAILY_QUESTIONS = 10;
export const BUZZ_WINDOW_MS = 4500;
export const ANSWER_WINDOW_S = 6;
export const BONUS_WINDOW_S = 8;
export const WORD_BASE_DELAY_MS = 150;
export const WORD_CHAR_DELAY_MS = 22;
export const PUNCTUATION_PAUSE_MS = 240;
export const ELO_K_FACTOR = 32;
export const STARTING_RATING = 1000;
export const RECONNECT_WINDOW_MS = 30_000;
export const MATCHMAKING_TIMEOUT_MS = 20_000;
export const MATCHMAKING_TICK_MS = 2_000;
export const MIN_BUZZ_TIME_MS = 50;
export const RATING_RANGE_INITIAL = 200;
