'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminStats, type ActivityPoint, type AdminCategory } from '@/lib/admin-auth';
import StatsGrid from '@/components/admin/StatsGrid';

const S = { w: 20, h: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const icons = {
  users: <svg {...S}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  zap: <svg {...S}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  help: <svg {...S}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  layers: <svg {...S}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  flag: <svg {...S}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  building: <svg {...S}><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  calendar: <svg {...S}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  trending: <svg {...S}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
};

/* ── Lightweight SVG Area Chart ── */

function ActivityChart({ data }: { data: ActivityPoint[] }) {
  if (data.length < 2) return null;

  const W = 720, H = 200;
  const padL = 38, padR = 12, padT = 8, padB = 26;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const maxVal = Math.max(1, ...data.map(d => Math.max(d.signups, d.matches)));
  const stepX = cw / (data.length - 1);

  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + ch - (v / maxVal) * ch;

  const line = (key: 'signups' | 'matches') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join('');

  const area = (key: 'signups' | 'matches') =>
    `${line(key)}L${x(data.length - 1).toFixed(1)},${(padT + ch).toFixed(1)}L${x(0).toFixed(1)},${(padT + ch).toFixed(1)}Z`;

  // Y-axis grid
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = Math.round(maxVal - (maxVal / gridCount) * i);
    return { y: padT + (ch / gridCount) * i, label: val };
  });

  // X-axis labels (~6 evenly spaced)
  const labelStep = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data
    .map((d, i) => ({ i, d }))
    .filter((_, i) => i % labelStep === 0 || i === data.length - 1);

  const fmtDate = (s: string) => {
    const d = new Date(s + 'T00:00:00');
    return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="admin-chart-svg">
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="rgba(255,255,255,0.04)" />
          <text x={padL - 8} y={g.y + 3.5} textAnchor="end" className="admin-chart-label">{g.label}</text>
        </g>
      ))}

      <defs>
        <linearGradient id="grad-signups" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(198,244,50,0.18)" />
          <stop offset="100%" stopColor="rgba(198,244,50,0)" />
        </linearGradient>
        <linearGradient id="grad-matches" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(96,165,250,0.15)" />
          <stop offset="100%" stopColor="rgba(96,165,250,0)" />
        </linearGradient>
      </defs>

      <path d={area('matches')} fill="url(#grad-matches)" />
      <path d={area('signups')} fill="url(#grad-signups)" />

      <path d={line('matches')} fill="none" stroke="rgba(96,165,250,0.7)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={line('signups')} fill="none" stroke="rgba(198,244,50,0.8)" strokeWidth="1.5" strokeLinejoin="round" />

      {xLabels.map(({ i, d }) => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" className="admin-chart-label">
          {fmtDate(d.date)}
        </text>
      ))}
    </svg>
  );
}

/* ── Horizontal Bar Chart for Categories ── */

function CategoryBars({ categories }: { categories: AdminCategory[] }) {
  const sorted = [...categories].filter(c => c.active).sort((a, b) => b.count - a.count);
  const max = Math.max(1, sorted[0]?.count ?? 1);

  if (sorted.length === 0) return <div className="admin-empty"><div className="admin-empty-title">No categories</div></div>;

  return (
    <div className="admin-bars">
      {sorted.map(c => (
        <div key={c.id} className="admin-bar-row">
          <div className="admin-bar-label">{c.name}</div>
          <div className="admin-bar-track">
            <div className="admin-bar-fill" style={{ width: `${(c.count / max) * 100}%` }} />
          </div>
          <div className="admin-bar-value">{c.count}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[] | null>(null);
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);

  useEffect(() => {
    adminApi.fetchStats().then(setStats).catch(() => {});
    adminApi.fetchActivity(30).then(setActivity).catch(() => {});
    adminApi.fetchCategories().then(setCategories).catch(() => {});
  }, []);

  if (!stats) return <div className="admin-loading"><div className="admin-loading-spinner" /></div>;

  return (
    <div className="admin-page">
      <div className="admin-welcome">
        <div className="admin-welcome-title">Dashboard</div>
        <div className="admin-welcome-sub">Campus Trivia platform overview</div>
      </div>

      <StatsGrid stats={[
        { label: 'Total Players', value: stats.totalUsers, icon: icons.users },
        { label: 'Total Matches', value: stats.totalMatches, icon: icons.zap },
        { label: 'Total Questions', value: stats.totalQuestions, icon: icons.help },
        { label: 'Categories', value: stats.totalCategories, icon: icons.layers },
        { label: 'Open Reports', value: stats.openReports, icon: icons.flag, sub: stats.openReports > 0 ? 'Needs attention' : 'All clear' },
        { label: 'Universities', value: stats.totalUniversities, icon: icons.building },
        { label: 'Matches Today', value: stats.matchesToday, icon: icons.calendar },
        { label: 'Signups This Week', value: stats.signupsThisWeek, icon: icons.trending },
      ]} />

      <div className="admin-charts-row">
        <div className="admin-chart-card admin-chart-card--wide">
          <div className="admin-chart-header">
            <div className="admin-chart-title">Platform Activity</div>
            <div className="admin-chart-legend">
              <span className="admin-legend-dot" style={{ background: 'rgba(198,244,50,0.8)' }} />
              <span className="admin-legend-label">Signups</span>
              <span className="admin-legend-dot" style={{ background: 'rgba(96,165,250,0.7)' }} />
              <span className="admin-legend-label">Matches</span>
            </div>
          </div>
          {activity ? (
            <ActivityChart data={activity} />
          ) : (
            <div className="admin-chart-skeleton"><div className="admin-skeleton" style={{ height: 180, width: '100%' }} /></div>
          )}
        </div>

        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">Questions by Category</div>
          </div>
          {categories ? (
            <CategoryBars categories={categories} />
          ) : (
            <div className="admin-chart-skeleton"><div className="admin-skeleton" style={{ height: 180, width: '100%' }} /></div>
          )}
        </div>
      </div>
    </div>
  );
}
