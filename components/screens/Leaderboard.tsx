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

export function Leaderboard({ active, auth, authStatus, onMenu }: Props) {
  const [tab, setTab] = useState<Tab>('players');
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [universities, setUniversities] = useState<UniversityRow[]>([]);
  const [ownRank, setOwnRank] = useState<OwnRank | null>(null);
  const [playerPage, setPlayerPage] = useState(1);
  const [uniPage, setUniPage] = useState(1);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [uniTotal, setUniTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPlayers = useCallback(async (page: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await auth.api.get<{ items: PlayerRow[]; total: number }>(`/leaderboards/players?page=${page}&limit=20`);
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
    fetchPlayers(1, false);
    fetchUniversities(1, false);
    fetchOwnRank();
  }, [active, fetchPlayers, fetchUniversities, fetchOwnRank]);

  return (
    <section className="screen enter" id="s-leaderboard" hidden={!active}>
      <div className="head">
        <h2>Leaderboard</h2>
        <button className="back" type="button" onClick={onMenu}>Menu</button>
      </div>
      <div className="lb-tabs">
        <button className={'lb-tab' + (tab === 'players' ? ' active' : '')} type="button" onClick={() => setTab('players')}>Players</button>
        <button className={'lb-tab' + (tab === 'universities' ? ' active' : '')} type="button" onClick={() => setTab('universities')}>Universities</button>
      </div>

      {tab === 'players' && (
        <div className="lb-list">
          {players.map(p => (
            <div className="lb-row" key={p.id}>
              <span className="lb-rank">{p.rank}</span>
              <span className="lb-name">{p.username}</span>
              <span className="lb-rating">{p.rating}</span>
            </div>
          ))}
          {players.length < playerTotal && (
            <button className="btn ghost lb-more" type="button" disabled={loading} onClick={() => fetchPlayers(playerPage + 1, true)}>
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
        <div className="lb-list">
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
