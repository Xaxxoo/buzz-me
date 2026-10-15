'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/admin-auth';
import type { AdminMatch, Paginated } from '@/lib/admin-api';
import DataTable from '@/components/admin/DataTable';

export default function AdminMatches() {
  const [data, setData] = useState<Paginated<AdminMatch> | null>(null);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = useCallback((p: number) => {
    const filters: any = {};
    if (filterStatus) filters.status = filterStatus;
    if (filterType) filters.type = filterType;
    adminApi.fetchMatches(p, 20, filters).then(setData).catch(() => {});
  }, [filterStatus, filterType]);

  useEffect(() => { load(page); }, [page, load]);

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <select className="admin-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <select className="admin-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          <option value="solo">Solo</option>
          <option value="quick">Quick</option>
          <option value="team">Team</option>
          <option value="challenge">Challenge</option>
        </select>
      </div>
      {data && (
        <DataTable<AdminMatch>
          columns={[
            { key: 'type', label: 'Type', render: m => m.type.charAt(0).toUpperCase() + m.type.slice(1) },
            { key: 'status', label: 'Status', render: m => (
              <span className={`admin-badge ${m.status}`}>{m.status}</span>
            )},
            { key: 'participants', label: 'Players', render: m => m.participants?.length ?? 0 },
            { key: 'question_count', label: 'Questions' },
            { key: 'ranked', label: 'Ranked', render: m => m.ranked ? 'Yes' : 'No' },
            { key: 'created_at', label: 'Created', render: m => new Date(m.created_at).toLocaleDateString() },
          ]}
          data={data.items}
          total={data.total}
          page={data.page}
          limit={data.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
