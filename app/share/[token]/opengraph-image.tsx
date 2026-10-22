import { ImageResponse } from 'next/og';
import { decodeResult, parseMarks, type ShareToken } from '@/lib/share';
import type { Pattern } from '@/lib/types';

export const alt = 'Campus Trivia result';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/* ── Fonts (loaded once at module scope) ── */

const unboundedBold = fetch(
  'https://fonts.gstatic.com/s/unbounded/v12/Yq6F-LOTXCb04q32xlpat-6uR42XTqtG6__2040.ttf',
).then(r => r.arrayBuffer());

const interTightSemiBold = fetch(
  'https://fonts.gstatic.com/s/intertight/v9/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mj0QiqXA.ttf',
).then(r => r.arrayBuffer());

/* ── Crest SVG builder (server-side, produces base64 data URI) ── */

const SHIELD = 'M8 6H92V56C92 84 70 100 50 110C30 100 8 84 8 56Z';
const INK = '#f0ebe3';
const PAPER = '#131211';

function divisionSvg(pat: Pattern, fill: string): string {
  switch (pat) {
    case 'chief': return `<rect x="0" y="0" width="100" height="32" fill="${fill}"/><circle cx="50" cy="90" r="9" fill="${fill}"/>`;
    case 'chevron': return `<path d="M0 12L50 40L100 12V30L50 58L0 30Z" fill="${fill}"/><path d="M20 80L50 96L80 80V92L50 108L20 92Z" fill="${fill}"/>`;
    case 'bend': return `<path d="M-10 26L26 -10L110 74L74 110Z" fill="${fill}"/>`;
    case 'sun': return `<circle cx="50" cy="24" r="11" fill="${fill}"/><path d="M50 4v-8M30 24h-9M79 24h-9M35 10l-6-6M65 10l6-6" stroke="${fill}" stroke-width="5" stroke-linecap="round"/><path d="M0 84H100V120H0Z" fill="${fill}"/>`;
    case 'bars': return `<rect x="0" y="16" width="100" height="12" fill="${fill}"/><rect x="0" y="80" width="100" height="10" fill="${fill}"/>`;
    case 'split': return `<rect x="50" y="0" width="50" height="120" fill="${fill}"/>`;
    case 'quarter': return `<rect x="0" y="0" width="50" height="57" fill="${fill}"/><rect x="50" y="57" width="50" height="60" fill="${fill}"/>`;
    case 'cross': return `<rect x="41" y="0" width="18" height="120" fill="${fill}"/><rect x="0" y="18" width="100" height="14" fill="${fill}"/>`;
    default: return '';
  }
}

function crestDataUri(short: string, a: string, b: string, pat: Pattern): string {
  const id = 'c' + Math.random().toString(36).slice(2, 8);
  const n = short.length;
  const fs = n > 7 ? 11.5 : n > 6 ? 13 : n > 5 ? 15 : n > 3 ? 19 : 24;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 104 118">`,
    `<defs><clipPath id="${id}"><path d="${SHIELD}"/></clipPath></defs>`,
    `<path d="${SHIELD}" fill="${a}"/>`,
    `<g clip-path="url(#${id})">${divisionSvg(pat, b)}</g>`,
    `<path d="${SHIELD}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`,
    `<rect x="1" y="42" width="98" height="30" rx="6" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>`,
    `<text x="50" y="${57 + fs * 0.36}" text-anchor="middle" font-family="Arial Black,sans-serif" font-weight="900" font-size="${fs}" fill="${INK}">${short}</text>`,
    `</svg>`,
  ].join('');
  const b64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

/* ── Marks row for daily ── */
const MARK_SQUARE: Record<string, string> = { right: '\u{1F7E9}', wrong: '\u{1F7E5}', skip: '\u2B1C' };

/* ── Shared font config ── */
async function getFonts() {
  const [fontDisplay, fontBody] = await Promise.all([unboundedBold, interTightSemiBold]);
  return [
    { name: 'Unbounded', data: fontDisplay, style: 'normal' as const, weight: 700 as const },
    { name: 'Inter Tight', data: fontBody, style: 'normal' as const, weight: 600 as const },
  ];
}

/* ── Image generation ── */

type Props = { params: Promise<{ token: string }> };

export default async function OgImage({ params }: Props) {
  const { token } = await params;
  const data = decodeResult(token);
  const fonts = await getFonts();

  if (!data) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a09', color: '#f0ebe3', fontSize: 48, fontFamily: 'Unbounded' }}>
        Campus Trivia
      </div>,
      { ...size, fonts },
    );
  }

  if (data.k === 'm') return matchImage(data, fonts);
  return dailyImage(data, fonts);
}

function matchImage(d: ShareToken & { k: 'm' }, fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: number }[]) {
  const youCrest = crestDataUri(d.ys, d.ya, d.yb, d.yp);
  const rivalCrest = crestDataUri(d.rs, d.ra, d.rb, d.rp);

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a09', padding: '40px 60px' }}>
      {/* Branding */}
      <div style={{ display: 'flex', fontSize: 24, color: '#c6f432', fontFamily: 'Unbounded', letterSpacing: '0.06em', marginBottom: 24 }}>
        CAMPUS TRIVIA
      </div>

      {/* Scoreline row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
        {/* You */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src={youCrest} width={120} height={140} />
          <span style={{ fontFamily: 'Inter Tight', fontSize: 22, color: '#f0ebe3' }}>{d.ys}</span>
        </div>

        {/* Scores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: 'Unbounded', fontSize: 96, color: '#f0ebe3' }}>{d.sy}</span>
          <span style={{ fontFamily: 'Unbounded', fontSize: 64, color: '#666' }}>{'\u2013'}</span>
          <span style={{ fontFamily: 'Unbounded', fontSize: 96, color: '#f0ebe3' }}>{d.sr}</span>
        </div>

        {/* Rival */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src={rivalCrest} width={120} height={140} />
          <span style={{ fontFamily: 'Inter Tight', fontSize: 22, color: '#f0ebe3' }}>{d.rs}</span>
        </div>
      </div>

      {/* Verdict */}
      <div style={{ display: 'flex', fontSize: 28, color: '#c6f432', fontFamily: 'Inter Tight', fontWeight: 600, marginTop: 32 }}>
        {d.v}
      </div>
    </div>,
    { ...size, fonts },
  );
}

function dailyImage(d: ShareToken & { k: 'd' }, fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: number }[]) {
  const crest = crestDataUri(d.ys, d.ya, d.yb, d.yp);
  const marks = parseMarks(d.m);

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a09', padding: '40px 60px' }}>
      {/* Branding */}
      <div style={{ display: 'flex', fontSize: 24, color: '#c6f432', fontFamily: 'Unbounded', letterSpacing: '0.06em', marginBottom: 24 }}>
        CAMPUS TRIVIA — DAILY
      </div>

      {/* Crest */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <img src={crest} width={120} height={140} />
        <span style={{ fontFamily: 'Inter Tight', fontSize: 22, color: '#f0ebe3' }}>{d.ys}</span>
      </div>

      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 20 }}>
        <span style={{ fontFamily: 'Unbounded', fontSize: 80, color: '#f0ebe3' }}>{d.s}</span>
        <span style={{ fontFamily: 'Inter Tight', fontSize: 28, color: '#888' }}>pts</span>
      </div>

      {/* Marks row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, fontSize: 32 }}>
        {marks.map((m, i) => (
          <span key={i}>{MARK_SQUARE[m]}</span>
        ))}
      </div>

      {/* Verdict */}
      <div style={{ display: 'flex', fontSize: 26, color: '#c6f432', fontFamily: 'Inter Tight', fontWeight: 600, marginTop: 24 }}>
        {d.v}
      </div>
    </div>,
    { ...size, fonts },
  );
}
