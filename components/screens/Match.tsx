'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Crest } from '@/components/Crest';
import { num, type GameState } from '@/lib/engine';
import { useCountUp } from '@/lib/hooks';
import type { School, Team } from '@/lib/types';

/** A bar that drains over `secs`. Remounting the inner bar (key) restarts it. */
function Meter({ id, k, secs, paused = false, hideWhenIdle = false }: { id: string; k: number; secs: number; paused?: boolean; hideWhenIdle?: boolean }) {
  return (
    <div className={'meter' + (hideWhenIdle && !secs ? ' idle' : '')} id={id}>
      <i key={k} style={secs ? { animation: `drain ${secs}s linear forwards`, animationPlayState: paused ? 'paused' : 'running' } : { animation: 'none' }} />
    </div>
  );
}

/** One side of the scoreboard: crest, score, the four seats, and the +10 / −5 chips that float off it. */
function TeamPanel({ team, school, score, seat }: { team: Team; school: School; score: number; seat: GameState['seat'] }) {
  const shown = useCountUp(score);
  const last = useRef(score);
  const [bump, setBump] = useState(0);
  const [chips, setChips] = useState<{ id: number; d: number }[]>([]);

  useEffect(() => {
    const d = score - last.current;
    last.current = score;
    if (!d) return;
    const id = performance.now() + Math.random();
    setBump(b => b + 1);
    setChips(c => [...c, { id, d }]);
    setTimeout(() => setChips(c => c.filter(x => x.id !== id)), 1250);
  }, [score]);

  return (
    <div className={'team ' + team} id={'t-' + team}>
      <span id={'c-' + team}><Crest school={school} /></span>
      <div className="meta">
        <div className="who" id={'n-' + team}>{school.short}</div>
        <div key={bump} className={'pts' + (bump ? ' hit' : '')} id={'sc-' + team}>{num(shown)}</div>
        <div className="seats flex gap-1 mt-[5px]" id={'seats-' + team}>
          {[0, 1, 2, 3].map(i => <i key={i} className={seat && seat.team === team && seat.idx === i ? 'on' : ''} />)}
        </div>
      </div>
      {chips.map(c => <span key={c.id} className={'chip' + (c.d < 0 ? ' neg' : '')}>{(c.d > 0 ? '+' : '−') + Math.abs(c.d)}</span>)}
    </div>
  );
}

function PrivateMatchPanel({ code, onJoin, onCancel }: { code: string | null; onJoin?: (code: string) => void; onCancel?: () => void }) {
  const [joinCode, setJoinCode] = useState('');
  return (
    <div className="private-panel flex flex-col items-center gap-3">
      {code && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm">Your room code:</span>
          <span className="private-code">{code}</span>
          <span className="text-xs opacity-70">Share this with your opponent</span>
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm">Or join someone else&apos;s room:</span>
        <div className="flex gap-2">
          <input className="code-input" type="text" maxLength={6} placeholder="Enter code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
          <button className="btn small" type="button" disabled={joinCode.length < 4} onClick={() => onJoin?.(joinCode)}>Join</button>
        </div>
      </div>
      <button className="btn ghost small" type="button" onClick={onCancel}>Cancel</button>
    </div>
  );
}

interface Props {
  active: boolean;
  s: GameState;
  boardKey: string;
  onBuzz: () => void;
  onAnswer: (text: string) => void;
  onAcceptBot?: () => void;
  onDismissBot?: () => void;
  onCancelFind?: () => void;
  onJoinPrivate?: (code: string) => void;
  onCancelPrivate?: () => void;
  onTutorialNext?: () => void;
}

export function Match({ active, s, boardKey, onBuzz, onAnswer, onAcceptBot, onDismissBot, onCancelFind, onJoinPrivate, onCancelPrivate, onTutorialNext }: Props) {
  const qtext = useRef<HTMLParagraphElement>(null);
  const solo = s.mode === 'daily';
  const cardKey = `${s.qi}-${s.bonusCard ? 'b' : 't'}`;
  const teamColor = (t: Team) => (t === 'you' ? s.you?.a : s.rival?.a) ?? '#1B1464';

  /* keep the newest word in view on small screens */
  useEffect(() => { const el = qtext.current; if (el) el.scrollTop = el.scrollHeight; }, [s.words.length]);

  return (
    <section className="screen match enter flex-auto min-h-0 flex flex-col gap-3" id="s-match" hidden={!active}>
      <header className={'board' + (solo ? ' solo' : '')} id="board">
        {s.you && <TeamPanel key={'you' + boardKey} team="you" school={s.you} score={s.scoreYou} seat={s.seat} />}
        <span className="mid">vs</span>
        {solo || !s.rival ? (
          <div className="team rival" id="t-rival">
            <div className="meta">
              <div className="who" id="n-rival">Daily challenge</div>
              <div className="pts" id="sc-rival">{s.dayLabel}</div>
            </div>
          </div>
        ) : (
          <TeamPanel key={'rival' + boardKey} team="rival" school={s.rival} score={s.scoreRival} seat={s.seat} />
        )}
      </header>

      <div className="pips flex gap-[5px] shrink-0" id="pips" aria-hidden="true">
        {Array.from({ length: s.total }, (_, i) => <i key={i} className={s.took[i] || (i === s.qi ? 'now' : '')} />)}
      </div>

      <article className={'card' + (s.bonusCard ? ' bonus' : '')} id="card">
        <span className="tag" id="tag">{s.tag}</span>
        <p className="qtext" id="qtext" ref={qtext}>
          {s.words.map((w, i) => (
            <span key={`${cardKey}-${i}`} className={'w' + (w.late ? ' late' : '')} style={w.delay ? { animationDelay: w.delay + 'ms' } : undefined}>{w.text}</span>
          ))}
        </p>
        {s.answer && <p className="answer" id="answer">Answer: {s.answer}</p>}
        {s.stamp && <div key={s.stamp.key} className="stamp" id="stamp" style={{ '--c': teamColor(s.stamp.team) } as CSSProperties}>{s.stamp.text}</div>}
      </article>

      {s.tutorialTip && (
        <div className="tutorial-tip" style={{ pointerEvents: (s.tutorialStep === 2 || s.tutorialStep === 3) ? 'none' : 'auto' }}>
          <p>{s.tutorialTip}</p>
          {s.tutorialStep !== 2 && s.tutorialStep !== 3 && (
            <button className="btn small" type="button" style={{ pointerEvents: 'auto' }} onClick={onTutorialNext}>Got it</button>
          )}
        </div>
      )}

      {s.spectating && <div className="flex justify-center"><span className="spectating-badge">Spectating</span></div>}
      <p className="status" id="status" role="status" aria-live="polite">{s.status}</p>

      {s.finding && s.botOffer && (
        <div className="bot-offer flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <button className="btn" type="button" onClick={onAcceptBot}>Play Bot</button>
            <button className="btn ghost" type="button" onClick={onDismissBot}>Keep Waiting</button>
          </div>
          <button className="btn ghost small" type="button" onClick={onCancelFind}>Cancel</button>
        </div>
      )}

      {s.privateWaiting && (
        <PrivateMatchPanel code={s.privateCode} onJoin={onJoinPrivate} onCancel={onCancelPrivate} />
      )}

      <div className="zone shrink-0 min-h-[226px] flex flex-col justify-center">
        {!s.spectating && (
          <div className="z-buzz flex flex-col items-center gap-3" id="z-buzz" hidden={s.zone !== 'buzz'}>
            <Meter id="window" k={s.window.key} secs={s.window.secs} hideWhenIdle />
            <button
              className={'dome' + (s.buzzLive ? ' live' : '')} id="buzz" type="button" aria-label="Buzz" disabled={!s.buzzLive}
              onPointerDown={e => { e.preventDefault(); onBuzz(); }} onClick={onBuzz}
            >
              <span className="base" /><span className="cap" id="buzzcap">{s.buzzLive ? 'Buzz' : 'Wait'}</span>
            </button>
          </div>
        )}

        {!s.spectating && (
          <div className="z-opts flex flex-col gap-2" id="z-opts" hidden={s.zone !== 'opts'}>
            {s.ask && <>
              <Meter id="timer" k={s.ask.key} secs={s.ask.secs} paused={s.ask.paused} />
              <div className="opts" id="opts">
                {s.ask.options.map((o, i) => (
                  <button key={`${s.ask!.key}-${i}`} type="button" className={'opt' + (o.mark ? ' ' + o.mark : '')} disabled={o.disabled} onClick={() => onAnswer(o.text)}>
                    <span className="key">{'ABCD'[i]}</span><span className="txt">{o.text}</span>
                  </button>
                ))}
              </div>
            </>}
          </div>
        )}

        <div className="z-rival flex items-center gap-3.5 justify-center" id="z-rival" hidden={s.zone !== 'rival'}>
          {s.rival && s.rivalView && <>
            <span id="rv-crest"><Crest school={s.rival} /></span>
            <div className={'bubble' + (s.rivalView.mark ? ' ' + s.rivalView.mark : '')} id="bubble">
              <small>{s.rivalView.small}</small>
              {s.rivalView.big ? <span>{s.rivalView.big}</span> : <span className="dots"><i /><i /><i /></span>}
            </div>
          </>}
        </div>
      </div>
    </section>
  );
}
