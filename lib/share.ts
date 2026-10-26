import type { Pattern } from './types';
import type { Mark } from './save';
import type { MatchResult, DailyResult } from './engine';

/* ── Compact token for sharing results via URL ── */

/** Match payload */
interface MatchToken {
  k: 'm';
  /** you.short */  ys: string;
  /** you.a */      ya: string;
  /** you.b */      yb: string;
  /** you.pat */    yp: Pattern;
  /** rival.short */ rs: string;
  /** rival.a */    ra: string;
  /** rival.b */    rb: string;
  /** rival.pat */  rp: Pattern;
  /** scoreYou */   sy: number;
  /** scoreRival */ sr: number;
  /** verdict */    v: string;
}

/** Daily payload */
interface DailyToken {
  k: 'd';
  ys: string;
  ya: string;
  yb: string;
  yp: Pattern;
  /** score */      s: number;
  /** marks as string: r/w/s */ m: string;
  v: string;
}

export type ShareToken = MatchToken | DailyToken;

/* ── Base64url helpers ── */

function toBase64url(s: string): string {
  // Always use the browser-safe path — Buffer polyfills don't support 'base64url'
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded)));
}

/* ── Public API ── */

const MARK_CHAR: Record<Mark, string> = { right: 'r', wrong: 'w', skip: 's' };
const CHAR_MARK: Record<string, Mark> = { r: 'right', w: 'wrong', s: 'skip' };

export function encodeResult(r: MatchResult | DailyResult): string {
  let payload: ShareToken;
  if (r.kind === 'match') {
    payload = {
      k: 'm',
      ys: r.you.short, ya: r.you.a, yb: r.you.b, yp: r.you.pat,
      rs: r.rival.short, ra: r.rival.a, rb: r.rival.b, rp: r.rival.pat,
      sy: r.scoreYou, sr: r.scoreRival,
      v: r.verdict,
    };
  } else {
    payload = {
      k: 'd',
      ys: r.you.short, ya: r.you.a, yb: r.you.b, yp: r.you.pat,
      s: r.score,
      m: r.marks.map(mk => MARK_CHAR[mk]).join(''),
      v: r.verdict,
    };
  }
  return toBase64url(JSON.stringify(payload));
}

export function decodeResult(token: string): ShareToken | null {
  try {
    const raw = JSON.parse(fromBase64url(token));
    if (raw && (raw.k === 'm' || raw.k === 'd')) return raw as ShareToken;
    return null;
  } catch {
    return null;
  }
}

/** Expand marks string back to Mark[] */
export function parseMarks(m: string): Mark[] {
  return [...m].map(c => CHAR_MARK[c] ?? 'skip');
}
