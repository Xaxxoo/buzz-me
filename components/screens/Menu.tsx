'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Crest } from '@/components/Crest';
import { DAILY, GAME_NAME } from '@/lib/config';
import { num } from '@/lib/engine';
import { ALL, school } from '@/lib/schools';
import { liveStreak, nextIn, today, type Save } from '@/lib/save';
import type { School } from '@/lib/types';
import type { AuthStatus } from '@/lib/auth';

interface Props {
  active: boolean;
  save: Save;
  you: School | null;
  authStatus: AuthStatus;
  username: string | null;
  onPlay: () => void;
  onDaily: () => void;
  onStats: () => void;
  onSignIn: () => void;
  onQuickMatch: () => void;
  onLeaderboard: () => void;
  onTeams: () => void;
  onChallenges: () => void;
  onFriendly: () => void;
}

/* 24px line glyphs for the mode rows. */
const ICONS: Record<string, ReactNode> = {
  daily: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  board: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></>,
  stats: <path d="M5 20V11M12 20V4M19 20v-6" />,
  online: <><circle cx="12" cy="12" r="3" /><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" /></>,
  teams: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></>,
  challenge: <path d="M5 4l7 7M4 13l3 3 3-3M14 4l-4 4M19 4l-9 9M13 16l3 3 3-3M16 16l3-3" />,
  friendly: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
};

function Mode({ icon, title, sub, badge, accent, onClick }: { icon: string; title: string; sub: string; badge?: string; accent?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={'mode' + (accent ? ' accent' : '')} onClick={onClick}>
      <svg className="mode-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[icon]}</svg>
      <span className="mode-tx"><b>{title}{badge && <em>{badge}</em>}</b><span>{sub}</span></span>
      <svg className="mode-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
  );
}

/* A few well-known schools the mystery rival flickers through. */
const TEASE = ['University of Lagos', 'University of Ghana', 'Makerere University', 'University of Nairobi', 'University of Cape Town', 'Ahmadu Bello University', 'University of Ibadan', 'Kenyatta University'];

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

/** Your crest against a rival that cycles like a slot machine until you press Play. */
function Versus({ you, onPlay }: { you: School | null; onPlay: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI(n => n + 1), 1100);
    return () => clearInterval(t);
  }, []);
  const pool = TEASE.map(n => ALL.find(u => u.name === n)).filter(Boolean).map(u => school(u!.name, u!.country)).filter(r => r.id !== you?.id);
  const rival = pool[i % pool.length];
  return (
    <div className="play-vs">
      <div className="pv-row">
        <div className="pv-side">
          {you ? <Crest school={you} /> : <span className="pv-blank">You</span>}
          <b>{you ? you.short : 'Your school'}</b>
        </div>
        <span className="pv-mark">VS</span>
        <div className="pv-side rival">
          {rival && <span key={i} className="pv-flip"><Crest school={rival} /></span>}
          <b>Random rival</b>
        </div>
      </div>
      <button className="play-slab" id="start" type="button" onClick={onPlay}>
        <span className="ps-tx"><b>Play</b><small>8 toss-ups, first to the buzzer</small></span>
        <span className="ps-go"><Arrow /></span>
      </button>
    </div>
  );
}

export function Menu({ active, save, you, authStatus, onPlay, onDaily, onStats, onSignIn, onQuickMatch, onLeaderboard, onTeams, onChallenges, onFriendly }: Props) {
  const done = !!save.daily && save.daily.date === today();
  const streak = liveStreak(save);
  const authed = authStatus === 'authenticated';
  return (
    <section className="screen title enter flex-auto min-h-0 flex flex-col items-center overflow-y-auto" id="s-title" hidden={!active}>
      <div className="title-l">
        <header className="hero">
          <p className="eyebrow">Inter-university quiz</p>
          <h1 className="logo">
            {GAME_NAME}
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative, already sized WebP */}
            <img className="logo-cap" src="/art/cap.webp" alt="" width={520} height={382} />
          </h1>
          <p className="lede">Hear the question. Beat the other school to the buzzer.</p>
        </header>
        <div className="vs-wrap">
          <Versus you={you} onPlay={onPlay} />
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative, already sized WebP */}
          <img className="art-buzzer" src="/art/buzzer.webp" alt="" width={520} height={452} loading="lazy" />
        </div>
      </div>

      <div className="title-r">
      <nav className="modes" aria-label="Menu">
        {authed && <Mode icon="online" title="Quick match" sub="Play a live opponent from another school." accent onClick={onQuickMatch} />}
        {!authed && authStatus !== 'loading' && (
          <Mode icon="online" title="Play online" sub="Sign in to face real students live." accent onClick={onSignIn} />
        )}
        <Mode
          icon="daily" title="Daily challenge" badge={streak > 0 ? `${streak}-day streak` : undefined}
          sub={done ? `Done: ${num(save.daily!.score)} of ${DAILY * 20}. Next in ${nextIn()}.` : `${DAILY} questions, same for everyone.`}
          onClick={onDaily}
        />
        <Mode icon="board" title="Leaderboard" sub="Players and schools, ranked." onClick={onLeaderboard} />
        <Mode icon="stats" title="My stats" sub={`Rating ${save.rating}` + (you ? `, playing for ${you.short}` : '')} onClick={onStats} />
        {authed && <Mode icon="teams" title="Teams" sub="Form a squad and play together." onClick={onTeams} />}
        {authed && <Mode icon="challenge" title="Challenges" sub="Call out another university." onClick={onChallenges} />}
        {authed && <Mode icon="friendly" title="Friendly match" sub="Play a friend with a private code." onClick={onFriendly} />}
      </nav>

      <dl className="rules" aria-label="Scoring">
        <div><dt>+10</dt><dd>right answer</dd></div>
        <div><dt>+15</dt><dd>buzz before it ends</dd></div>
        <div><dt>&minus;5</dt><dd>early buzz, wrong</dd></div>
      </dl>
      </div>
    </section>
  );
}
