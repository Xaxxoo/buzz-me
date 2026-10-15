'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-auth';
import type { AdminCategory } from '@/lib/admin-api';
import Modal from '@/components/admin/Modal';

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; name: string; slug: string }>({ name: '', slug: '' });

  const load = () => { adminApi.fetchCategories().then(setCategories).catch(() => {}); };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing({ name: '', slug: '' }); setModalOpen(true); };
  const openEdit = (c: AdminCategory) => { setEditing({ id: c.id, name: c.name, slug: c.slug }); setModalOpen(true); };

  const save = async () => {
    if (editing.id) {
      await adminApi.updateCategory(editing.id, { name: editing.name, slug: editing.slug });
    } else {
      await adminApi.createCategory({ name: editing.name, slug: editing.slug });
    }
    setModalOpen(false);
    load();
  };

  const toggleActive = async (c: AdminCategory) => {
    await adminApi.updateCategory(c.id, { active: !c.active });
    load();
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={openCreate}>+ New Category</button>
      </div>
      <div className="admin-card-grid">
        {categories.map(c => (
          <div key={c.id} className={`admin-card category${!c.active ? ' inactive' : ''}`}>
            <div className="admin-card-value">{c.count}</div>
            <div className="admin-card-label">{c.name}</div>
            <div className="admin-card-sub">{c.slug}</div>
            <div className="admin-card-actions">
              <button className="admin-btn small" onClick={() => openEdit(c)}>Edit</button>
              <button className="admin-btn small ghost" onClick={() => toggleActive(c)}>
                {c.active ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={modalOpen} title={editing.id ? 'Edit Category' : 'New Category'} onClose={() => setModalOpen(false)}>
        <div className="admin-form">
          <label>Name
            <input className="admin-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>Slug
            <input className="admin-input" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })}
              placeholder="e.g. science-tech" />
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
