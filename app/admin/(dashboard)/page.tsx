'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminStats } from '@/lib/admin-auth';
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

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminApi.fetchStats().then(setStats).catch(() => {});
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
    </div>
  );
}
