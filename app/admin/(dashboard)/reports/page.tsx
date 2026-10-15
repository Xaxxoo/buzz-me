'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/admin-auth';
import type { AdminReport, Paginated } from '@/lib/admin-api';
import DataTable from '@/components/admin/DataTable';

export default function AdminReports() {
  const [data, setData] = useState<Paginated<AdminReport> | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback((p: number) => {
    adminApi.fetchReports(p).then(setData).catch(() => {});
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const updateStatus = async (id: string, status: string) => {
    await adminApi.updateReportStatus(id, status);
    load(page);
  };

  return (
    <div className="admin-page">
      {data && (
        <DataTable<AdminReport>
          columns={[
            { key: 'reporter', label: 'Reporter', render: r => r.reporter?.username ?? r.reporter_id.slice(0, 8) },
            { key: 'subject_type', label: 'Type', render: r => r.subject_type.charAt(0).toUpperCase() + r.subject_type.slice(1) },
            { key: 'reason', label: 'Reason' },
            { key: 'description', label: 'Details', render: r => r.description ? (r.description.length > 50 ? r.description.slice(0, 50) + '...' : r.description) : '-' },
            { key: 'status', label: 'Status', render: r => (
              <span className={`admin-badge ${r.status}`}>{r.status}</span>
            )},
            { key: 'actions', label: '', render: r => r.status === 'open' ? (
              <div className="admin-actions">
                <button className="admin-btn small" onClick={e => { e.stopPropagation(); updateStatus(r.id, 'resolved'); }}>Resolve</button>
                <button className="admin-btn small ghost" onClick={e => { e.stopPropagation(); updateStatus(r.id, 'dismissed'); }}>Dismiss</button>
              </div>
            ) : null },
            { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString() },
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
