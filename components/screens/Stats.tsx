import { DAILY } from '@/lib/config';
import { num } from '@/lib/engine';
import { liveStreak, type Save } from '@/lib/save';
import type { School } from '@/lib/types';

export function StatCells({ cells, id }: { cells: [string, string][]; id: string }) {
  return (
    <dl className="stats" id={id}>
      {cells.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

export function Stats({ active, save, you, onMenu }: { active: boolean; save: Save; you: School | null; onMenu: () => void }) {
  const streak = liveStreak(save);
  const rows = Object.entries(save.cats).filter(([, v]) => Array.isArray(v) && v[1] > 0).sort((a, b) => b[1][1] - a[1][1]);
  return (
    <section className="screen stats-scr enter flex-auto min-h-0 flex flex-col gap-3" id="s-stats" hidden={!active}>
      <div className="head shrink-0 flex items-center justify-between gap-2.5"><h2>My stats</h2><button className="back" id="stats-back" type="button" onClick={onMenu}>Menu</button></div>
      <p className="pick-note" id="stats-school">
        {you ? `Playing for ${you.name}. Saved on this device.` : 'No school picked yet. Saved on this device.'}
      </p>
      <StatCells id="stat-tiles" cells={[
        ['Rating', String(save.rating)],
        ['Matches', `${save.won}W ${save.lost}L` + (save.drawn ? ` ${save.drawn}D` : '')],
        ['Daily streak', `${streak} (best ${save.streak.best})`],
        ['Best daily', save.bestDaily == null ? 'None' : `${num(save.bestDaily)}/${DAILY * 20}`],
      ]} />
      <h3>Right answers by subject</h3>
      <div className="cats flex-auto min-h-0 overflow-y-auto grid gap-2 content-start pb-2" id="cats">
        {rows.length === 0 && <p className="empty">Nothing here yet. Play a match or today&rsquo;s daily and your right answers show up by subject.</p>}
        {rows.map(([name, [right, total]]) => (
          <div className="cat" key={name}>
            <span>{name}</span>
            <div className="bar"><i style={{ width: Math.round((right / total) * 100) + '%' }} /></div>
            <b>{right}/{total}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
