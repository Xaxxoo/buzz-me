'use client';

import { Component, Suspense, useState, useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { GameState, WordView, AskView, RivalView } from '@/lib/engine';
import type { School } from '@/lib/types';
import { defaultSave } from '@/lib/save';

const ArenaCanvas = dynamic(() => import('@/components/arena/ArenaCanvas'), { ssr: false });

/* ── Error boundary ── */
class ErrorBoundary extends Component<{ children: ReactNode; onError?: (msg: string) => void }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message + '\n' + e.stack }; }
  componentDidCatch(e: Error) { this.props.onError?.(e.message); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 16, background: '#1a0000', border: '1px solid #f87171', borderRadius: 12, color: '#f87171', font: '500 12px/1.5 monospace', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
        {this.state.error}
      </div>
    );
    return this.props.children;
  }
}

/* ── Mock data ── */
const YOU: School = { id: 'unilag', name: 'University of Lagos', country: 'NG', short: 'UNILAG', a: '#8E1B3A', b: '#F5C518', pat: 'chief' };
const RIVAL: School = { id: 'unn', name: 'University of Nigeria', country: 'NG', short: 'UNN', a: '#0B8457', b: '#FFD23F', pat: 'chevron' };

const WORDS: WordView[] = 'What is the capital city of Nigeria and when was it officially designated?'.split(' ').map(t => ({ text: t + ' ', late: false }));

const OPTIONS: AskView = {
  key: 1, secs: 15, paused: false,
  options: [
    { text: 'Abuja', mark: '', disabled: false },
    { text: 'Lagos', mark: '', disabled: false },
    { text: 'Kano', mark: '', disabled: false },
    { text: 'Port Harcourt', mark: '', disabled: false },
  ],
};

const OPTIONS_ANSWERED: AskView = {
  key: 2, secs: 0, paused: true,
  options: [
    { text: 'Abuja', mark: 'right', disabled: true },
    { text: 'Lagos', mark: 'wrong', disabled: true },
    { text: 'Kano', mark: '', disabled: true },
    { text: 'Port Harcourt', mark: '', disabled: true },
  ],
};

const RIVAL_VIEW: RivalView = { small: 'UNN is answering...', big: null, mark: '' };
const RIVAL_VIEW_ANSWERED: RivalView = { small: 'UNN answered', big: 'Lagos', mark: 'wrong' };

const EMPTY_SAVE = defaultSave();

const base: GameState = {
  hydrated: true, screen: 's-match', muted: false,
  you: YOU, rival: RIVAL, mode: 'match', pending: null, pickKey: 0, boardKey: 0,
  total: 8, qi: 3, scoreYou: 30, scoreRival: 20,
  took: ['you', 'rival', 'you', undefined, undefined, undefined, undefined, undefined],
  dayLabel: '',
  tag: 'Geography', bonusCard: false, words: WORDS, visibleCount: 8, buzzedAtWord: -1, answer: null,
  stamp: null, status: '',
  zone: 'buzz', buzzLive: true, window: { key: 1, secs: 10 },
  ask: null, rivalView: null,
  seat: { key: 1, team: 'you', idx: 1 }, flash: null,
  result: null, resultKey: 0,
  save: EMPTY_SAVE,
  selectedCategories: [], difficulty: 'medium',
  matchMode: 'local', matchId: null, finding: false, findElapsed: 0, botOffer: false, opponentName: null,
  teamView: 'list', myTeams: [], activeTeam: null, lobby: null, teamFinding: false,
  notifications: [], unreadCount: 0,
  challengeView: 'board', challenges: [], activeChallenge: null, challengeLobby: null,
  privateCode: null, privateWaiting: false,
  onlinePlayers: [], incomingChallenge: null, challengeSent: false,
  devices: [],
  spectating: false, spectateMatchId: null,
  universityProfile: null,
  campusLayout: null,
  online: true, reconnecting: false,
  questionsLoading: false, questionsError: null,
  pendingJoinCode: null,
};

type Zone = 'buzz' | 'opts' | 'opts-answered' | 'rival' | 'rival-answered' | 'stamp';

const ZONES: { label: string; zone: Zone }[] = [
  { label: 'Buzz', zone: 'buzz' },
  { label: 'Options', zone: 'opts' },
  { label: 'Answered', zone: 'opts-answered' },
  { label: 'Rival', zone: 'rival' },
  { label: 'Rival Ans', zone: 'rival-answered' },
  { label: 'Stamp', zone: 'stamp' },
];

function stateForZone(zone: Zone): GameState {
  switch (zone) {
    case 'buzz':
      return { ...base, zone: 'buzz', buzzLive: true };
    case 'opts':
      return { ...base, zone: 'opts', buzzLive: false, ask: OPTIONS, visibleCount: WORDS.length };
    case 'opts-answered':
      return { ...base, zone: 'opts', buzzLive: false, ask: OPTIONS_ANSWERED, answer: 'Abuja', visibleCount: WORDS.length };
    case 'rival':
      return { ...base, zone: 'rival', buzzLive: false, rivalView: RIVAL_VIEW, visibleCount: WORDS.length };
    case 'rival-answered':
      return { ...base, zone: 'rival', buzzLive: false, rivalView: RIVAL_VIEW_ANSWERED, visibleCount: WORDS.length };
    case 'stamp':
      return { ...base, zone: 'buzz', buzzLive: false, stamp: { key: Date.now(), text: 'CORRECT!', team: 'you' }, visibleCount: WORDS.length };
  }
}

export default function ArenaDemoPage() {
  const [zone, setZone] = useState<Zone>('buzz');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const onErr = (e: ErrorEvent) => setErrors(prev => [...prev, e.message]);
    const onRej = (e: PromiseRejectionEvent) => setErrors(prev => [...prev, String(e.reason)]);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej); };
  }, []);

  const s = stateForZone(zone);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', fontFamily: 'var(--font-body, system-ui)' }}>
      <h1 style={{ font: '800 28px/1.1 var(--font-display, system-ui)', color: '#c6f432', marginBottom: 8 }}>
        3D Arena Demo
      </h1>
      <p style={{ color: '#8a847b', fontSize: 14, marginBottom: 16 }}>
        Three.js quiz arena renderer. Click zones to test different game states.
      </p>

      {errors.length > 0 && (
        <div style={{ padding: 12, marginBottom: 16, background: '#1a0000', border: '1px solid #f87171', borderRadius: 10, color: '#f87171', font: '500 11px/1.5 monospace', maxHeight: 120, overflow: 'auto' }}>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {ZONES.map(z => (
          <button
            key={z.zone}
            onClick={() => setZone(z.zone)}
            style={{
              padding: '10px 22px', borderRadius: 10, cursor: 'pointer',
              border: z.zone === zone ? '1px solid rgba(198,244,50,0.2)' : '1px solid rgba(255,255,255,0.06)',
              background: z.zone === zone ? 'rgba(198,244,50,0.08)' : 'transparent',
              color: z.zone === zone ? '#c6f432' : '#8a847b',
              font: '600 13px var(--font-body, system-ui)',
            }}
          >
            {z.label}
          </button>
        ))}
      </div>

      <ErrorBoundary onError={msg => setErrors(prev => [...prev, msg])}>
        <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: '#0a0a09' }}>
          <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#8a847b', fontSize: 13 }}>Loading Three.js...</div>}>
            <ArenaCanvas
              active
              s={s}
              boardKey="demo"
              onBuzz={() => setZone('opts')}
              onAnswer={(text) => { console.log('answered:', text); setZone('opts-answered'); }}
            />
          </Suspense>
        </div>
      </ErrorBoundary>
    </div>
  );
}
