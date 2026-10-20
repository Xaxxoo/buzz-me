'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-auth';
import type { LeaderboardPlayer, LeaderboardUniversity, AdminCategory } from '@/lib/admin-api';
import DataTable from '@/components/admin/DataTable';

type Tab = 'players' | 'universities';
type Period = 'alltime' | 'weekly' | 'season';

interface Board<T> { items: T[]; total: number; page: number; limit: number }

export default function AdminLeaderboards() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('players');
  const [period, setPeriod] = useState<Period>('alltime');
  const [category, setCategory] = useState<string>('');
  const [categories, setCategories] = useState<AdminCategory[]>([]);

  const [players, setPlayers] = useState<Board<LeaderboardPlayer> | null>(null);
  const [universities, setUniversities] = useState<Board<LeaderboardUniversity> | null>(null);
  const [playerPage, setPlayerPage] = useState(1);
  const [uniPage, setUniPage] = useState(1);

  useEffect(() => {
    adminApi.fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const loadPlayers = useCallback((p: number, per: Period, cat: string) => {
    adminApi.fetchPlayerLeaderboard(p, 20, per, cat || undefined).then(setPlayers).catch(() => {});
  }, []);

  const loadUniversities = useCallback((p: number) => {
    adminApi.fetchUniversityLeaderboard(p, 20).then(setUniversities).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'players') loadPlayers(playerPage, period, category);
  }, [tab, playerPage, period, category, loadPlayers]);

  useEffect(() => {
    if (tab === 'universities') loadUniversities(uniPage);
  }, [tab, uniPage, loadUniversities]);

  const isTimeBound = period === 'weekly' || period === 'season';
  const isCategoryMode = !!category;

  return (
    <div className="admin-page">
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`admin-btn${tab === 'players' ? '' : ' ghost'}`} onClick={() => setTab('players')}>
          Players
        </button>
        <button className={`admin-btn${tab === 'universities' ? '' : ' ghost'}`} onClick={() => setTab('universities')}>
          Universities
        </button>
      </div>

      {tab === 'players' && (
        <>
          {/* Period + Category filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {(['alltime', 'weekly', 'season'] as Period[]).map(p => (
              <button
                key={p}
                className={`admin-btn small${period === p && !category ? '' : ' ghost'}`}
                onClick={() => { setPeriod(p); setCategory(''); setPlayerPage(1); }}
              >
                {p === 'alltime' ? 'All Time' : p === 'weekly' ? 'This Week' : 'Season'}
              </button>
            ))}
            <select
              className="admin-select"
              value={category}
              onChange={e => { setCategory(e.target.value); setPlayerPage(1); }}
              style={{ marginLeft: 8 }}
            >
              <option value="">All Categories</option>
              {categories.filter(c => c.active).map(c => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {players && (
            <DataTable<LeaderboardPlayer>
              onRowClick={p => router.push(`/admin/users/${p.id}`)}
              columns={[
                { key: 'rank', label: '#' },
                { key: 'username', label: 'Player' },
                { key: 'rating', label: 'Rating' },
                ...(isTimeBound ? [
                  { key: 'rating_change', label: 'Rating Change', render: (p: LeaderboardPlayer) => {
                    const v = p.rating_change ?? 0;
                    return <span style={{ color: v > 0 ? '#4ade80' : v < 0 ? '#f87171' : undefined }}>{v > 0 ? '+' : ''}{v}</span>;
                  }},
                ] : []),
                ...(isCategoryMode ? [
                  { key: 'accuracy', label: 'Accuracy', render: (p: LeaderboardPlayer) => `${p.accuracy ?? 0}%` },
                  { key: 'correct_answers', label: 'Correct', render: (p: LeaderboardPlayer) => String(p.correct_answers ?? 0) },
                ] : []),
                { key: 'matches_played', label: 'Played' },
                { key: 'matches_won', label: 'Won' },
              ]}
              data={players.items}
              total={players.total}
              page={players.page}
              limit={players.limit}
              onPageChange={setPlayerPage}
            />
          )}
        </>
      )}

      {tab === 'universities' && universities && (
        <DataTable<LeaderboardUniversity>
          columns={[
            { key: 'rank', label: '#' },
            { key: 'name', label: 'University' },
            { key: 'short_name', label: 'Short' },
            { key: 'country', label: 'Country' },
            { key: 'points', label: 'Points', render: u => u.points.toLocaleString() },
          ]}
          data={universities.items}
          total={universities.total}
          page={universities.page}
          limit={universities.limit}
          onPageChange={setUniPage}
        />
      )}
    </div>
  );
}
