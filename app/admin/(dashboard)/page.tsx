'use client';

import { useEffect, useState } from 'react';
import { AuthClient } from '@/lib/auth';
import { createAdminApi, type AdminStats } from '@/lib/admin-api';
import StatsGrid from '@/components/admin/StatsGrid';

const auth = new AuthClient();
const adminApi = createAdminApi(auth.api);

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    auth.hydrate().then(() => {
      adminApi.fetchStats().then(setStats).catch(() => {});
    });
  }, []);

  if (!stats) return <div className="admin-loading">Loading stats...</div>;

  return (
    <div className="admin-page">
      <StatsGrid stats={[
        { label: 'Total Users', value: stats.totalUsers },
        { label: 'Total Matches', value: stats.totalMatches },
        { label: 'Total Questions', value: stats.totalQuestions },
        { label: 'Categories', value: stats.totalCategories },
        { label: 'Open Reports', value: stats.openReports },
        { label: 'Universities', value: stats.totalUniversities },
        { label: 'Matches Today', value: stats.matchesToday },
        { label: 'Signups This Week', value: stats.signupsThisWeek },
      ]} />
    </div>
  );
}
