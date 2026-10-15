'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/admin-auth';
import type { AdminUniversity, Paginated } from '@/lib/admin-api';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';

const EMPTY = {
  name: '', short_name: '', country: '', email_domains: [] as string[],
  color_a: '#c6f432', color_b: '#5b8def', pattern: 'chief',
};

export default function AdminUniversities() {
  const [data, setData] = useState<Paginated<AdminUniversity> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(EMPTY);

  const load = useCallback((p: number, q: string) => {
    adminApi.fetchUniversities(p, 20, q || undefined).then(setData).catch(() => {});
  }, []);

  useEffect(() => { load(page, search); }, [page, search, load]);

  const openCreate = () => { setEditing({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (u: AdminUniversity) => { setEditing({ ...u, email_domains: [...u.email_domains] }); setModalOpen(true); };

  const save = async () => {
    if (editing.id) {
      await adminApi.updateUniversity(editing.id, editing);
    } else {
      await adminApi.createUniversity(editing);
    }
    setModalOpen(false);
    load(page, search);
  };

  const remove = async (id: string) => {
    await adminApi.deleteUniversity(id);
    load(page, search);
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={e => { e.preventDefault(); setPage(1); setSearch(searchInput); }}>
          <input type="text" placeholder="Search universities..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)} className="admin-input" />
          <button type="submit" className="admin-btn">Search</button>
        </form>
        <button className="admin-btn" onClick={openCreate}>+ New University</button>
      </div>
      {data && (
        <DataTable<AdminUniversity>
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'short_name', label: 'Short' },
            { key: 'country', label: 'Country' },
            { key: 'points', label: 'Points' },
            { key: 'colors', label: 'Colors', render: u => (
              <span style={{ display: 'inline-flex', gap: 4 }}>
                <span style={{ width: 16, height: 16, borderRadius: 3, background: u.color_a, display: 'inline-block' }} />
                <span style={{ width: 16, height: 16, borderRadius: 3, background: u.color_b, display: 'inline-block' }} />
              </span>
            )},
            { key: 'actions', label: '', render: u => (
              <div className="admin-actions">
                <button className="admin-btn small" onClick={e => { e.stopPropagation(); openEdit(u); }}>Edit</button>
                <button className="admin-btn small danger" onClick={e => { e.stopPropagation(); remove(u.id); }}>Del</button>
              </div>
            )},
          ]}
          data={data.items}
          total={data.total}
          page={data.page}
          limit={data.limit}
          onPageChange={setPage}
        />
      )}
      <Modal open={modalOpen} title={editing.id ? 'Edit University' : 'New University'} onClose={() => setModalOpen(false)}>
        <div className="admin-form">
          <label>Name
            <input className="admin-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>Short Name
            <input className="admin-input" value={editing.short_name} onChange={e => setEditing({ ...editing, short_name: e.target.value })} maxLength={10} />
          </label>
          <label>Country
            <input className="admin-input" value={editing.country} onChange={e => setEditing({ ...editing, country: e.target.value })} />
          </label>
          <label>Email Domains (comma-separated)
            <input className="admin-input" value={(editing.email_domains ?? []).join(', ')}
              onChange={e => setEditing({ ...editing, email_domains: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>Color A
              <input type="color" className="admin-input" value={editing.color_a} onChange={e => setEditing({ ...editing, color_a: e.target.value })} />
            </label>
            <label style={{ flex: 1 }}>Color B
              <input type="color" className="admin-input" value={editing.color_b} onChange={e => setEditing({ ...editing, color_b: e.target.value })} />
            </label>
          </div>
          <label>Pattern
            <select className="admin-input" value={editing.pattern} onChange={e => setEditing({ ...editing, pattern: e.target.value })}>
              {['chief', 'chevron', 'bend', 'sun', 'bars', 'split', 'quarter', 'cross'].map(p =>
                <option key={p} value={p}>{p}</option>
              )}
            </select>
          </label>
          <div className="admin-form-actions">
            <button className="admin-btn" onClick={save}>Save</button>
            <button className="admin-btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
