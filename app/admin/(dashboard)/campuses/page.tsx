'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/admin-auth';
import type { AdminCampus, AdminCampusLandmark, AdminUniversity, Paginated } from '@/lib/admin-api';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';

const EMPTY_CAMPUS = {
  name: '',
  university_id: null as string | null,
  layout: '{\n  "bounds": { "width": 100, "height": 100 },\n  "buildings": []\n}',
  fallback_image_url: '',
  osm_attribution: '',
  active: true,
};

const EMPTY_LANDMARK = {
  key: '',
  name: '',
  description: '',
  position_x: 0,
  position_y: 0,
  challenge_question_count: 5,
};

export default function AdminCampuses() {
  const [campuses, setCampuses] = useState<AdminCampus[] | null>(null);
  const [universities, setUniversities] = useState<AdminUniversity[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({ ...EMPTY_CAMPUS });
  const [editId, setEditId] = useState<string | null>(null);

  // Landmark state
  const [landmarks, setLandmarks] = useState<AdminCampusLandmark[]>([]);
  const [landmarkEditing, setLandmarkEditing] = useState<any | null>(null);
  const [landmarkModalOpen, setLandmarkModalOpen] = useState(false);

  const load = useCallback(() => {
    adminApi.fetchCampuses().then(setCampuses).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.fetchUniversities(1, 500).then(r => setUniversities(r.items)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditId(null);
    setEditing({ ...EMPTY_CAMPUS });
    setLandmarks([]);
    setModalOpen(true);
  };

  const openEdit = async (c: AdminCampus) => {
    setEditId(c.id);
    setEditing({
      name: c.name,
      university_id: c.university_id,
      layout: JSON.stringify(c.layout, null, 2),
      fallback_image_url: c.fallback_image_url ?? '',
      osm_attribution: c.osm_attribution ?? '',
      active: c.active,
    });
    try {
      const lm = await adminApi.fetchCampusLandmarks(c.id);
      setLandmarks(lm);
    } catch { setLandmarks([]); }
    setModalOpen(true);
  };

  const save = async () => {
    let parsedLayout: any;
    try {
      parsedLayout = JSON.parse(editing.layout);
    } catch {
      alert('Invalid layout JSON');
      return;
    }

    const payload = {
      name: editing.name,
      university_id: editing.university_id || null,
      layout: parsedLayout,
      fallback_image_url: editing.fallback_image_url || null,
      osm_attribution: editing.osm_attribution || null,
      active: editing.active,
    };

    if (editId) {
      await adminApi.updateCampus(editId, payload);
    } else {
      await adminApi.createCampus(payload);
    }
    setModalOpen(false);
    load();
  };

  const remove = async (id: string) => {
    await adminApi.deleteCampus(id);
    load();
  };

  // Landmark CRUD
  const openAddLandmark = () => {
    setLandmarkEditing({ ...EMPTY_LANDMARK, _isNew: true });
    setLandmarkModalOpen(true);
  };

  const openEditLandmark = (lm: AdminCampusLandmark) => {
    setLandmarkEditing({ ...lm, _isNew: false });
    setLandmarkModalOpen(true);
  };

  const saveLandmark = async () => {
    if (!editId || !landmarkEditing) return;
    const data = {
      key: landmarkEditing.key,
      name: landmarkEditing.name,
      description: landmarkEditing.description || null,
      position_x: Number(landmarkEditing.position_x),
      position_y: Number(landmarkEditing.position_y),
      challenge_question_count: Number(landmarkEditing.challenge_question_count),
    };

    if (landmarkEditing._isNew) {
      await adminApi.createCampusLandmark(editId, data);
    } else {
      await adminApi.updateCampusLandmark(landmarkEditing.id, data);
    }
    const lm = await adminApi.fetchCampusLandmarks(editId);
    setLandmarks(lm);
    setLandmarkModalOpen(false);
  };

  const removeLandmark = async (id: string) => {
    if (!editId) return;
    await adminApi.deleteCampusLandmark(id);
    const lm = await adminApi.fetchCampusLandmarks(editId);
    setLandmarks(lm);
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <div />
        <button className="admin-btn" onClick={openCreate}>+ New Campus</button>
      </div>

      {campuses && (
        <DataTable<AdminCampus>
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'university', label: 'University', render: c => c.university?.name ?? '—' },
            { key: 'landmarks', label: 'Landmarks', render: c => String(c.landmarks?.length ?? '—') },
            { key: 'active', label: 'Status', render: c => (
              <span className={`admin-badge ${c.active ? 'on' : 'off'}`}>
                {c.active ? 'Active' : 'Inactive'}
              </span>
            )},
            { key: 'actions', label: '', render: c => (
              <div className="admin-actions">
                <button className="admin-btn small" onClick={e => { e.stopPropagation(); openEdit(c); }}>Edit</button>
                <button className="admin-btn small danger" onClick={e => { e.stopPropagation(); remove(c.id); }}>Del</button>
              </div>
            )},
          ]}
          data={campuses}
          total={campuses.length}
          page={1}
          limit={campuses.length || 20}
          onPageChange={() => {}}
        />
      )}

      {/* Campus create/edit modal */}
      <Modal open={modalOpen} title={editId ? 'Edit Campus' : 'New Campus'} onClose={() => setModalOpen(false)}>
        <div className="admin-form">
          <label>Name
            <input className="admin-input" value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>University
            <select className="admin-input" value={editing.university_id ?? ''}
              onChange={e => setEditing({ ...editing, university_id: e.target.value || null })}>
              <option value="">— None —</option>
              {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label>Layout JSON
            <textarea className="admin-input" rows={8} value={editing.layout}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              onChange={e => setEditing({ ...editing, layout: e.target.value })} />
          </label>
          <label>Fallback Image URL
            <input className="admin-input" value={editing.fallback_image_url}
              onChange={e => setEditing({ ...editing, fallback_image_url: e.target.value })} />
          </label>
          <label>OSM Attribution
            <input className="admin-input" value={editing.osm_attribution}
              onChange={e => setEditing({ ...editing, osm_attribution: e.target.value })} />
          </label>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={editing.active}
              onChange={e => setEditing({ ...editing, active: e.target.checked })} />
            Active
          </label>

          {/* Landmarks section (only when editing an existing campus) */}
          {editId && (
            <div style={{ borderTop: '1px solid var(--color-fog)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong style={{ fontSize: 14 }}>Landmarks ({landmarks.length})</strong>
                <button className="admin-btn small" onClick={openAddLandmark}>+ Add</button>
              </div>
              {landmarks.length === 0 && <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No landmarks yet.</p>}
              {landmarks.map(lm => (
                <div key={lm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-fog)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{lm.name}</span>
                    <span style={{ color: 'var(--color-muted)', fontSize: 12, marginLeft: 8 }}>{lm.key} ({lm.position_x}, {lm.position_y})</span>
                  </div>
                  <div className="admin-actions">
                    <button className="admin-btn small" onClick={() => openEditLandmark(lm)}>Edit</button>
                    <button className="admin-btn small danger" onClick={() => removeLandmark(lm.id)}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-form-actions">
            <button className="admin-btn" onClick={save}>Save Campus</button>
            <button className="admin-btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Landmark create/edit modal */}
      <Modal open={landmarkModalOpen} title={landmarkEditing?._isNew ? 'Add Landmark' : 'Edit Landmark'} onClose={() => setLandmarkModalOpen(false)}>
        {landmarkEditing && (
          <div className="admin-form">
            <label>Key (e.g. library, main_gate)
              <input className="admin-input" value={landmarkEditing.key} maxLength={30}
                onChange={e => setLandmarkEditing({ ...landmarkEditing, key: e.target.value })} />
            </label>
            <label>Name
              <input className="admin-input" value={landmarkEditing.name} maxLength={80}
                onChange={e => setLandmarkEditing({ ...landmarkEditing, name: e.target.value })} />
            </label>
            <label>Description
              <input className="admin-input" value={landmarkEditing.description ?? ''}
                onChange={e => setLandmarkEditing({ ...landmarkEditing, description: e.target.value })} />
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>Position X
                <input className="admin-input" type="number" value={landmarkEditing.position_x}
                  onChange={e => setLandmarkEditing({ ...landmarkEditing, position_x: e.target.value })} />
              </label>
              <label style={{ flex: 1 }}>Position Y
                <input className="admin-input" type="number" value={landmarkEditing.position_y}
                  onChange={e => setLandmarkEditing({ ...landmarkEditing, position_y: e.target.value })} />
              </label>
            </div>
            <label>Challenge Question Count
              <input className="admin-input" type="number" value={landmarkEditing.challenge_question_count}
                onChange={e => setLandmarkEditing({ ...landmarkEditing, challenge_question_count: e.target.value })} />
            </label>
            <div className="admin-form-actions">
              <button className="admin-btn" onClick={saveLandmark}>Save Landmark</button>
              <button className="admin-btn ghost" onClick={() => setLandmarkModalOpen(false)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
