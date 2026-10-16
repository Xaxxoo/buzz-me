'use client';

import type { ReactNode } from 'react';

interface Stat {
  label: string;
  value: number;
  sub?: string;
  icon?: ReactNode;
}

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="admin-stats-grid">
      {stats.map(s => (
        <div key={s.label} className="admin-card">
          {s.icon && <div className="admin-card-icon">{s.icon}</div>}
          <div className="admin-card-value">{s.value.toLocaleString()}</div>
          <div className="admin-card-label">{s.label}</div>
          {s.sub && <div className="admin-card-sub">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}
