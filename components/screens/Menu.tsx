import { DAILY, GAME_NAME } from '@/lib/config';
import { num } from '@/lib/engine';
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
}

export function Menu({ active, save, you, authStatus, username, onPlay, onDaily, onStats, onSignIn, onQuickMatch, onLeaderboard }: Props) {
  const done = !!save.daily && save.daily.date === today();
  const streak = liveStreak(save);
  const authed = authStatus === 'authenticated';
  return (
    <section className="screen title enter flex-auto min-h-0 flex flex-col gap-3 items-center justify-safe-center text-center overflow-y-auto pt-3" id="s-title" hidden={!active}>
      <h1 className="logo">{GAME_NAME}</h1>
      <p className="lede">The inter-university quiz. Beat the other school to the buzzer.</p>
      <div className="flex items-center gap-4">
        <button className="dome big live" id="start" type="button" aria-label="Play a match" onClick={onPlay}>
          <span className="base" /><span className="cap">Play</span>
        </button>
        {authed && (
          <button className="btn quick-match" type="button" onClick={onQuickMatch}>Quick Match</button>
        )}
      </div>
      {!authed && authStatus !== 'loading' && (
        <button className="btn ghost sign-in-cta" type="button" onClick={onSignIn}>Sign in to play online</button>
      )}
      <nav className="grid grid-cols-2 gap-2.5 w-full max-w-[400px] mt-1" aria-label="Menu">
        <button className="tile" id="m-daily" type="button" onClick={onDaily}>
          <b>Daily challenge</b>
          <span id="m-daily-sub">
            {done ? `Done today: ${num(save.daily!.score)} of ${DAILY * 20}. Next in ${nextIn()}.` : `${DAILY} questions, the same for everyone today.`}
          </span>
          {streak > 0 && <em id="m-streak">{streak}-day streak</em>}
        </button>
        <button className="tile" id="m-stats" type="button" onClick={onStats}>
          <b>My stats</b>
          <span id="m-stats-sub">{`Rating ${save.rating}` + (you ? `, playing for ${you.short}` : '')}</span>
        </button>
        <button className="tile" id="m-leaderboard" type="button" onClick={onLeaderboard}>
          <b>Leaderboard</b>
          <span>See how you rank against other players.</span>
        </button>
      </nav>
      <ul className="rules">
        <li><b>10</b>for a right answer</li>
        <li><b>15</b>if you buzz before the question ends</li>
        <li><b>&minus;5</b>if you buzz early and miss</li>
      </ul>
    </section>
  );
}
