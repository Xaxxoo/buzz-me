import type { Api } from './api';
import { SAVE_KEY } from './config';

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

/**
 * Merge local and server saves, keeping the most-progressed data from each.
 * Local wins for streak/daily (may not have synced), server wins for
 * rating/match stats (authoritatively updated server-side after matches).
 */
export function mergeSaves(local: Save, remote: Save): Save {
  // Pick the streak with the more recent `last` date, or the higher count
  let streak = local.streak;
  const localDay = local.streak.last ? dayNum(local.streak.last) : -1;
  const remoteDay = remote.streak.last ? dayNum(remote.streak.last) : -1;
  if (remoteDay > localDay) {
    streak = { ...remote.streak };
  } else if (remoteDay === localDay && remote.streak.n > local.streak.n) {
    streak = { ...remote.streak };
  }
  streak.best = Math.max(local.streak.best, remote.streak.best);

  // Pick the daily record for the more recent date
  const daily = (() => {
    if (!local.daily && !remote.daily) return null;
    if (!local.daily) return remote.daily;
    if (!remote.daily) return local.daily;
    return dayNum(local.daily.date) >= dayNum(remote.daily.date) ? local.daily : remote.daily;
  })();

  // Server is authoritative for match stats (updated server-side after matches)
  // Local is authoritative for daily/streak (updated client-side only)
  const merged: Save = {
    school: remote.school || local.school,
    rating: remote.rating,
    played: Math.max(local.played, remote.played),
    won: Math.max(local.won, remote.won),
    lost: Math.max(local.lost, remote.lost),
    drawn: Math.max(local.drawn, remote.drawn),
    cats: { ...local.cats, ...remote.cats },
    daily,
    bestDaily: Math.max(local.bestDaily ?? 0, remote.bestDaily ?? 0) || null,
    streak,
  };
  return merged;
}

export function record(s: Save, cat: string, ok: boolean) {
  const c = s.cats[cat] || (s.cats[cat] = [0, 0]);
  c[1]++;
  if (ok) c[0]++;
}
