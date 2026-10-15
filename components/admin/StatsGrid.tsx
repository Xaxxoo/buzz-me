'use client';

interface Stat {
  label: string;
  value: number;
  sub?: string;
}

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="admin-stats-grid">
      {stats.map(s => (
        <div key={s.label} className="admin-card">
          <div className="admin-card-value">{s.value.toLocaleString()}</div>
          <div className="admin-card-label">{s.label}</div>
          {s.sub && <div className="admin-card-sub">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}
