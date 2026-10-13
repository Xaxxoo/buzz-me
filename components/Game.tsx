'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Backdrop } from '@/components/Backdrop';
import { Leaderboard } from '@/components/screens/Leaderboard';
import { Login } from '@/components/screens/Login';
import { Match } from '@/components/screens/Match';
import { Menu } from '@/components/screens/Menu';
import { Picker } from '@/components/screens/Picker';
import { Result } from '@/components/screens/Result';
import { Signup } from '@/components/screens/Signup';
import { Stats } from '@/components/screens/Stats';
import { Versus } from '@/components/screens/Versus';
import { AuthClient } from '@/lib/auth';
import { GAME_NAME } from '@/lib/config';
import { GameEngine } from '@/lib/engine';
import { SocketClient } from '@/lib/socket';

/**
 * The whole game is one client component tree driven by a GameEngine instance.
 * Every screen stays mounted and is shown or hidden, which keeps the picker's scroll
 * position and lets CSS entrance animations replay each time a screen appears.
 */
export default function Game() {
  const [auth] = useState(() => new AuthClient());
  const [engine] = useState(() => { const e = new GameEngine(); e.auth = auth; return e; });
  const [socket] = useState(() => new SocketClient(engine, auth));
  const authState = useSyncExternalStore(auth.subscribe, auth.getSnapshot, auth.getSnapshot);
  const s = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  const stage = useRef<HTMLElement>(null);

  /* hydrate auth first, then engine */
  useEffect(() => { auth.hydrate(); }, [auth]);
  useEffect(() => {
    if (authState.status !== 'loading') engine.hydrate();
  }, [engine, authState.status]);

  /* connect socket when authenticated, disconnect on cleanup or logout */
  useEffect(() => {
    if (authState.status === 'authenticated') socket.connect();
    else socket.disconnect();
    return () => socket.disconnect();
  }, [socket, authState.status]);

  /* Space buzzes, 1-4 or A-D answers */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (engine.getSnapshot().screen !== 's-match' || e.repeat || e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (s.matchMode === 'online') socket.buzz();
        else engine.buzz();
        return;
      }
      if (e.key.length !== 1) return;
      const k = e.key.toLowerCase(), i = '1234'.includes(k) ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
      if (i >= 0) {
        if (s.matchMode === 'online') socket.answer(i);
        else engine.answerIndex(i);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, socket, s.matchMode]);

  /* a small shake of the whole stage on every buzz */
  const flashKey = s.flash?.key ?? 0;
  useEffect(() => {
    const el = stage.current;
    if (!flashKey || !el) return;
    el.classList.remove('jolt');
    void el.offsetWidth;
    el.classList.add('jolt');
  }, [flashKey]);

  const flashColor = (s.flash?.team === 'rival' ? s.rival?.a : s.you?.a) ?? '#E8322C';
  const vars = { '--you': s.you?.a ?? '#0B8457', '--rival': s.rival?.a ?? '#1763B8' } as CSSProperties;

  const onBuzz = () => { if (s.matchMode === 'online') socket.buzz(); else engine.buzz(); };
  const onAnswer = (text: string) => {
    if (s.matchMode === 'online') {
      const idx = s.ask?.options.findIndex(o => o.text === text) ?? -1;
      if (idx >= 0) socket.answer(idx);
    } else {
      engine.answer(text);
    }
  };

  const onQuickMatch = () => {
    engine.findQuickMatch();
    socket.findMatch();
  };

  return (
    <>
      <Backdrop flashKey={flashKey} flashColor={flashColor} />
      <main className="stage" id="stage" data-screen={s.screen} ref={stage} style={vars}>
        <div className="bar">
          <span className="mini">{GAME_NAME}</span>
          <div className="bar-right">
            {authState.status === 'authenticated' && <span className="auth-bar">{authState.user?.username}</span>}
            <button className="sound" id="sound" type="button" aria-pressed={s.muted} aria-label={s.muted ? 'Turn sound on' : 'Mute sound'} onClick={() => engine.toggleMute()}>
              <svg className="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" /><path d="M17 8.5a5 5 0 0 1 0 7" /><path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
              </svg>
              <svg className="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" /><path d="M17 9l5 6M22 9l-5 6" />
              </svg>
            </button>
          </div>
        </div>

        <Menu
          active={s.screen === 's-title'} save={s.save} you={s.you}
          authStatus={authState.status} username={authState.user?.username ?? null}
          onPlay={() => engine.play()} onDaily={() => engine.daily()} onStats={() => engine.showStats()}
          onSignIn={() => engine.showLogin()} onQuickMatch={onQuickMatch} onLeaderboard={() => engine.showLeaderboard()}
        />
        <Picker
          key={s.pickKey} active={s.screen === 's-pick'} you={s.you} forDaily={s.pending === 'daily'}
          onChoose={sch => engine.choose(sch)} onGo={() => engine.go()} onMenu={() => engine.menu()}
        />
        <Stats active={s.screen === 's-stats'} save={s.save} you={s.you} onMenu={() => engine.menu()} />
        <Versus active={s.screen === 's-vs'} you={s.you} rival={s.rival} />
        <Match active={s.screen === 's-match'} s={s} boardKey={String(s.boardKey)} onBuzz={onBuzz} onAnswer={onAnswer} />
        <Result
          active={s.screen === 's-result'} result={s.result} resultKey={s.resultKey}
          authStatus={authState.status}
          onAgain={() => engine.rematch()} onMenu={() => engine.menu()} onSignup={() => engine.showSignup()}
        />
        <Login active={s.screen === 's-login'} auth={auth} onSignup={() => engine.showSignup()} onMenu={() => engine.menu()} />
        <Signup active={s.screen === 's-signup'} auth={auth} onLogin={() => engine.showLogin()} onMenu={() => engine.menu()} />
        <Leaderboard active={s.screen === 's-leaderboard'} auth={auth} authStatus={authState.status} onMenu={() => engine.menu()} />
      </main>
    </>
  );
}
