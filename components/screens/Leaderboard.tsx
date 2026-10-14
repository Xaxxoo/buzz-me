'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuthClient, AuthStatus } from '@/lib/auth';

interface PlayerRow {
  rank: number;
  id: string;
  username: string;
  rating: number;
  matches_played: number;
  matches_won: number;
}

interface UniversityRow {
  rank: number;
  id: string;
  name: string;
  short_name: string;
  country: string;
  points: number;
  color_a: string;
  color_b: string;
}

interface OwnRank {
  rank: number | null;
  rating: number;
  matches_played: number;
}

interface Props {
  active: boolean;
  auth: AuthClient;
  authStatus: AuthStatus;
  onMenu: () => void;
}

type Tab = 'players' | 'universities';
type Period = 'alltime' | 'weekly' | 'season';

export function Leaderboard({ active, auth, authStatus, onMenu }: Props) {
  const [tab, setTab] = useState<Tab>('players');
  const [period, setPeriod] = useState<Period>('alltime');
  const [category, setCategory] = useState<string>('');
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [universities, setUniversities] = useState<UniversityRow[]>([]);
  const [ownRank, setOwnRank] = useState<OwnRank | null>(null);
  const [playerPage, setPlayerPage] = useState(1);
  const [uniPage, setUniPage] = useState(1);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [uniTotal, setUniTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await auth.api.get<{ slug: string; name: string }[]>('/categories');
      setCategories(res);
    } catch { /* ignore */ }
  }, [auth.api]);

  const fetchPlayers = useCallback(async (page: number, append: boolean, p: Period, cat: string) => {
    setLoading(true);
    try {
      let url = `/leaderboards/players?page=${page}&limit=20&period=${p}`;
      if (cat) url += `&category=${encodeURIComponent(cat)}`;
      const res = await auth.api.get<{ items: PlayerRow[]; total: number }>(url);
      setPlayers(prev => append ? [...prev, ...res.items] : res.items);
      setPlayerTotal(res.total);
      setPlayerPage(page);
    } catch { /* ignore */ }
    setLoading(false);
  }, [auth.api]);

  const fetchUniversities = useCallback(async (page: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await auth.api.get<{ items: UniversityRow[]; total: number }>(`/leaderboards/universities?page=${page}&limit=20`);
      setUniversities(prev => append ? [...prev, ...res.items] : res.items);
      setUniTotal(res.total);
      setUniPage(page);
    } catch { /* ignore */ }
    setLoading(false);
  }, [auth.api]);

  const fetchOwnRank = useCallback(async () => {
    if (authStatus !== 'authenticated') return;
    try {
      const res = await auth.api.get<OwnRank>('/leaderboards/players/me');
      setOwnRank(res);
    } catch { /* ignore */ }
  }, [auth.api, authStatus]);

  useEffect(() => {
    if (!active) return;
    fetchPlayers(1, false, period, category);
    fetchUniversities(1, false);
    fetchOwnRank();
    fetchCategories();
  }, [active, period, category, fetchPlayers, fetchUniversities, fetchOwnRank, fetchCategories]);

  const switchPeriod = (p: Period) => {
    setPeriod(p);
    setPlayers([]);
    setPlayerPage(1);
  };

  const switchCategory = (slug: string) => {
    setCategory(slug);
    setPlayers([]);
    setPlayerPage(1);
  };

  return (
    <section className="screen enter flex-auto min-h-0 flex flex-col gap-3" id="s-leaderboard" hidden={!active}>
      <div className="head shrink-0 flex items-center justify-between gap-2.5">
        <h2>Leaderboard</h2>
        <button className="back" type="button" onClick={onMenu}>Menu</button>
      </div>
      <div className="lb-tabs flex shrink-0 border-3 border-ink rounded-[14px] overflow-hidden">
        <button className={'lb-tab' + (tab === 'players' ? ' active' : '')} type="button" onClick={() => setTab('players')}>Players</button>
        <button className={'lb-tab' + (tab === 'universities' ? ' active' : '')} type="button" onClick={() => setTab('universities')}>Universities</button>
      </div>

      {tab === 'players' && (
        <div className="lb-list flex-auto min-h-0 overflow-y-auto flex flex-col gap-2 pb-2">
          <div className="lb-period flex gap-1 shrink-0">
            <button className={'btn ghost small' + (period === 'alltime' ? ' active' : '')} type="button" onClick={() => switchPeriod('alltime')}>All Time</button>
            <button className={'btn ghost small' + (period === 'weekly' ? ' active' : '')} type="button" onClick={() => switchPeriod('weekly')}>This Week</button>
            <button className={'btn ghost small' + (period === 'season' ? ' active' : '')} type="button" onClick={() => switchPeriod('season')}>Season</button>
          </div>
          {categories.length > 0 && (
            <div className="lb-category flex gap-1 shrink-0 overflow-x-auto">
              <button className={'btn ghost small' + (!category ? ' active' : '')} type="button" onClick={() => switchCategory('')}>All</button>
              {categories.map(c => (
                <button key={c.slug} className={'btn ghost small' + (category === c.slug ? ' active' : '')} type="button" onClick={() => switchCategory(c.slug)}>{c.name}</button>
              ))}
            </div>
          )}
          {players.map(p => (
            <div className="lb-row" key={p.id}>
              <span className="lb-rank">{p.rank}</span>
              <span className="lb-name">{p.username}</span>
              <span className="lb-rating">{p.rating}</span>
            </div>
          ))}
          {players.length < playerTotal && (
            <button className="btn ghost lb-more" type="button" disabled={loading} onClick={() => fetchPlayers(playerPage + 1, true, period, category)}>
              {loading ? 'Loading\u2026' : 'Load more'}
            </button>
          )}
          {ownRank && ownRank.rank !== null && (
            <div className="lb-row lb-own">
              <span className="lb-rank">{ownRank.rank}</span>
              <span className="lb-name">You</span>
              <span className="lb-rating">{ownRank.rating}</span>
            </div>
          )}
          {ownRank && ownRank.rank === null && (
            <p className="lb-note">Play {Math.max(0, 5 - ownRank.matches_played)} more match{ownRank.matches_played >= 4 ? '' : 'es'} to get ranked.</p>
          )}
        </div>
      )}

      {tab === 'universities' && (
        <div className="lb-list flex-auto min-h-0 overflow-y-auto flex flex-col gap-2 pb-2">
          {universities.map(u => (
            <div className="lb-row" key={u.id}>
              <span className="lb-rank">{u.rank}</span>
              <span className="lb-name">{u.name}</span>
              <span className="lb-rating">{u.points}</span>
            </div>
          ))}
          {universities.length < uniTotal && (
            <button className="btn ghost lb-more" type="button" disabled={loading} onClick={() => fetchUniversities(uniPage + 1, true)}>
              {loading ? 'Loading\u2026' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
