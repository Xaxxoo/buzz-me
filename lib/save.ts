import type { Api } from './api';
import { DAILY, SAVE_KEY } from './config';
import { QUESTIONS } from './data/questions';
import { hash } from './schools';
import type { Question } from './types';

/* Progress is kept in this browser's localStorage. syncSave/loadServerSave mirror it to the server when authenticated. */

export type Mark = 'right' | 'wrong' | 'skip';

export interface DailyRecord {
  date: string;
  score: number;
  marks: Mark[];
  right: number;
  /** earliest right buzz, as the fraction of the question heard */
  best: number | null;
  /** true when the weekly free miss kept the streak going */
  froze: boolean;
}

export interface Save {
  school: { name: string; country: string } | null;
  rating: number;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  /** right and total answers per category */
  cats: Record<string, [number, number]>;
  daily: DailyRecord | null;
  bestDaily: number | null;
  streak: { n: number; last: string | null; best: number; freeze: string | null };
}

export const defaultSave = (): Save => ({
  school: null, rating: 1000, played: 0, won: 0, lost: 0, drawn: 0, cats: {}, daily: null, bestDaily: null,
  streak: { n: 0, last: null, best: 0, freeze: null },
});

export function loadSave(): Save {
  const base = defaultSave();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return base;
    const s: Save = { ...base, ...raw, streak: { ...base.streak, ...(raw.streak || {}) } };
    if (!s.cats || typeof s.cats !== 'object') s.cats = {};
    return s;
  } catch {
    return base;
  }
}

export function writeSave(s: Save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private window or storage blocked */ }
}

/** Fire-and-forget upload of save data to the server. */
export function syncSave(api: Api, save: Save) {
  api.put('/users/me/save', { save }).catch(() => { /* silently ignore */ });
}

/** Fetch save data from the server, or null on failure. */
export async function loadServerSave(api: Api): Promise<Save | null> {
  try {
    const data = await api.get<Save>('/users/me/save');
    if (data && typeof data === 'object') return { ...defaultSave(), ...data, streak: { ...defaultSave().streak, ...(data.streak || {}) } };
    return null;
  } catch { return null; }
}

/* The daily turns over at midnight UTC, so everyone gets the same set on the same day. */
export const today = () => new Date().toISOString().slice(0, 10);
export const dayNum = (d: string) => Math.round(Date.parse(d + 'T00:00:00Z') / 864e5);
export const niceDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function nextIn() {
  const ms = (dayNum(today()) + 1) * 864e5 - Date.now();
  const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  return h ? `${h}h ${m}m` : `${Math.max(1, m)}m`;
}

/* One missed day is forgiven per week. */
const freezeFree = (s: Save) => !s.streak.freeze || dayNum(today()) - dayNum(s.streak.freeze) >= 7;

export function liveStreak(s: Save) {
  const st = s.streak;
  if (!st.last) return 0;
  const gap = dayNum(today()) - dayNum(st.last);
  return gap <= 1 || (gap === 2 && freezeFree(s)) ? st.n : 0;
}

/** Counts today's daily toward the streak. Returns true when the free miss was used. */
export function bumpStreak(s: Save) {
  const st = s.streak, t = today(), gap = st.last ? dayNum(t) - dayNum(st.last) : null;
  let froze = false;
  if (gap === 0) return false;
  if (gap === 1) st.n++;
  else if (gap === 2 && freezeFree(s)) { st.n++; st.freeze = t; froze = true; }
  else st.n = 1;
  st.last = t;
  st.best = Math.max(st.best, st.n);
  return froze;
}

/* ---------- tutorial flag ---------- */
const TUTORIAL_KEY = 'quad.tutorial_done';
export function isTutorialDone(): boolean {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; }
}
export function markTutorialDone(): void {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* private window */ }
}

export function record(s: Save, cat: string, ok: boolean) {
  const c = s.cats[cat] || (s.cats[cat] = [0, 0]);
  c[1]++;
  if (ok) c[0]++;
}

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The same ten questions for everyone on a given date. */
export function dailySet(date: string): Question[] {
  const r = seeded(hash('quad ' + date)), a = QUESTIONS.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, DAILY);
}
