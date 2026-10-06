import { DAILY, GAME_NAME } from '@/lib/config';
import { num } from '@/lib/engine';
import { liveStreak, nextIn, today, type Save } from '@/lib/save';
import type { School } from '@/lib/types';

interface Props {
  active: boolean;
  save: Save;
  you: School | null;
  onPlay: () => void;
  onDaily: () => void;
  onStats: () => void;
}

export function Menu({ active, save, you, onPlay, onDaily, onStats }: Props) {
  const done = !!save.daily && save.daily.date === today();
  const streak = liveStreak(save);
  return (
    <section className="screen title enter" id="s-title" hidden={!active}>
      <h1 className="logo">{GAME_NAME}</h1>
      <p className="lede">The inter-university quiz. Beat the other school to the buzzer.</p>
      <button className="dome big live" id="start" type="button" aria-label="Play a match" onClick={onPlay}>
        <span className="base" /><span className="cap">Play</span>
      </button>
      <nav className="menu" aria-label="Menu">
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
      </nav>
      <ul className="rules">
        <li><b>10</b>for a right answer</li>
        <li><b>15</b>if you buzz before the question ends</li>
        <li><b>&minus;5</b>if you buzz early and miss</li>
      </ul>
    </section>
  );
}
