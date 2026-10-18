'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-auth';
import type { AdminUserStatsResponse } from '@/lib/admin-auth';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AdminUserStatsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminApi.fetchUserStats(id).then(setData).catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-empty">
          <div className="admin-empty-title">User not found</div>
          <button className="admin-btn ghost" style={{ marginTop: 12 }} onClick={() => router.push('/admin/users')}>
            Back to Players
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-page">
        <div className="admin-loading"><div className="admin-loading-spinner" /></div>
      </div>
    );
  }

  const { user, stats, categories, ratingHistory, recentMatches, sessions } = data;
  const winRate = user.matches_played > 0 ? user.matches_won / user.matches_played : 0;
  const lastSeen = sessions.length > 0
    ? sessions.reduce((a, b) => new Date(a.last_seen) > new Date(b.last_seen) ? a : b).last_seen
    : null;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-user-header">
        <button className="admin-btn ghost" onClick={() => router.push('/admin/users')} style={{ padding: '6px 12px', fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: -3 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Players
        </button>
        <div className="admin-user-header-info">
          <div className="admin-user-header-top">
            <h1 className="admin-user-header-name">{user.username}</h1>
            {user.is_admin && <span className="admin-badge on">Admin</span>}
          </div>
          <div className="admin-user-header-meta">
            <span>{user.email}</span>
            {user.university && <span className="admin-badge active">{user.university.short_name || user.university.name}</span>}
            <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
            {lastSeen && <span>Last active {timeAgo(lastSeen)}</span>}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="admin-stats-grid">
        <div className="admin-card">
          <div className="admin-card-value">{user.matches_played.toLocaleString()}</div>
          <div className="admin-card-label">Matches Played</div>
          <div className="admin-card-sub">{user.matches_won}W / {user.matches_lost}L / {user.matches_drawn}D</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{pct(winRate)}</div>
          <div className="admin-card-label">Win Rate</div>
          <div className="admin-card-sub">Streak: {stats.winStreak} (best: {stats.bestWinStreak})</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{user.rating.toLocaleString()}</div>
          <div className="admin-card-label">Rating</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{user.xp.toLocaleString()}</div>
          <div className="admin-card-label">XP</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{formatDuration(stats.totalTimePlayed)}</div>
          <div className="admin-card-label">Total Time Played</div>
          <div className="admin-card-sub">Avg: {formatDuration(stats.avgMatchDuration)} per match</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{pct(stats.accuracy)}</div>
          <div className="admin-card-label">Accuracy</div>
          <div className="admin-card-sub">{stats.correctAnswers}/{stats.totalAnswers} correct</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{stats.avgBuzzSpeed != null ? `${Math.round(stats.avgBuzzSpeed)}ms` : '-'}</div>
          <div className="admin-card-label">Avg Buzz Speed</div>
          {stats.avgBuzzPosition != null && <div className="admin-card-sub">Position: {pct(stats.avgBuzzPosition)}</div>}
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{stats.totalPointsScored.toLocaleString()}</div>
          <div className="admin-card-label">Total Points</div>
          <div className="admin-card-sub">
            Rebounds: {stats.reboundsCorrect}/{stats.reboundsAttempted}
            {stats.reboundsAttempted > 0 && ` (${pct(stats.reboundsCorrect / stats.reboundsAttempted)})`}
          </div>
        </div>
      </div>

      {/* Category Performance */}
      {categories.length > 0 && (
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">Category Performance</div>
          </div>
          <div className="admin-bars">
            {categories.map(cat => (
              <div key={cat.slug} className="admin-bar-row">
                <div className="admin-bar-label">{cat.name}</div>
                <div className="admin-bar-track">
                  <div
                    className="admin-stat-bar"
                    style={{ width: `${Math.round(cat.accuracy * 100)}%` }}
                  />
                </div>
                <div className="admin-bar-value">{cat.correct}/{cat.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating History */}
      {ratingHistory.length > 0 && (
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">Rating History</div>
            <div className="admin-chart-legend">
              <span className="admin-legend-label">Last {ratingHistory.length} rated matches</span>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {ratingHistory.map(r => (
                  <tr key={r.match_id}>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td>{r.rating_before}</td>
                    <td>{r.rating_after}</td>
                    <td>
                      <span className={`admin-rating-delta ${r.delta > 0 ? 'pos' : r.delta < 0 ? 'neg' : ''}`}>
                        {r.delta > 0 ? '+' : ''}{r.delta}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">Recent Matches</div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {recentMatches.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.date).toLocaleDateString()}</td>
                    <td>{m.type}</td>
                    <td>{m.opponentName ?? '-'}</td>
                    <td>{m.score}{m.opponentScore != null ? ` - ${m.opponentScore}` : ''}</td>
                    <td>
                      <span className={`admin-result-badge ${m.result}`}>
                        {m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D'}
                      </span>
                    </td>
                    <td>
                      {m.ratingBefore != null && m.ratingAfter != null ? (
                        <span className={`admin-rating-delta ${m.ratingAfter - m.ratingBefore > 0 ? 'pos' : m.ratingAfter - m.ratingBefore < 0 ? 'neg' : ''}`}>
                          {m.ratingAfter - m.ratingBefore > 0 ? '+' : ''}{m.ratingAfter - m.ratingBefore}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">Active Sessions</div>
            <div className="admin-chart-legend">
              <span className="admin-legend-label">{sessions.length} device{sessions.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="admin-sessions-list">
            {sessions.map(s => (
              <div key={s.id} className="admin-session-item">
                <div className="admin-session-device">{s.device_name}</div>
                <div className="admin-session-meta">
                  <span>Last seen {timeAgo(s.last_seen)}</span>
                  <span>First seen {new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
