'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthClient } from '@/lib/auth';
import { createAdminApi, type AdminUser, type Paginated } from '@/lib/admin-api';
import DataTable from '@/components/admin/DataTable';

const auth = new AuthClient();
const adminApi = createAdminApi(auth.api);

export default function AdminUsers() {
  const [data, setData] = useState<Paginated<AdminUser> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback((p: number, q: string) => {
    adminApi.fetchUsers(p, 20, q || undefined).then(setData).catch(() => {});
  }, []);

  useEffect(() => { auth.hydrate().then(() => load(page, search)); }, [page, search, load]);

  const toggleAdmin = async (user: AdminUser) => {
    await adminApi.updateUser(user.id, { is_admin: !user.is_admin });
    load(page, search);
  };

  return (
    <div className="admin-page">
      <form className="admin-search" onSubmit={e => { e.preventDefault(); setPage(1); setSearch(searchInput); }}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="admin-input"
        />
        <button type="submit" className="admin-btn">Search</button>
      </form>
      {data && (
        <DataTable<AdminUser>
          columns={[
            { key: 'username', label: 'Username' },
            { key: 'email', label: 'Email' },
            { key: 'rating', label: 'Rating' },
            { key: 'matches_played', label: 'Played' },
            { key: 'university', label: 'University', render: u => u.university?.name ?? '-' },
            { key: 'is_admin', label: 'Admin', render: u => (
              <button className={`admin-badge ${u.is_admin ? 'on' : 'off'}`} onClick={e => { e.stopPropagation(); toggleAdmin(u); }}>
                {u.is_admin ? 'Yes' : 'No'}
              </button>
            )},
            { key: 'created_at', label: 'Joined', render: u => new Date(u.created_at).toLocaleDateString() },
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
