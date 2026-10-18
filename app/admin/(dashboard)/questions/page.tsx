'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/admin-auth';
import type { AdminQuestion, AdminCategory, Paginated } from '@/lib/admin-api';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';

const EMPTY: Partial<AdminQuestion> = {
  category_id: '', text: '', options: ['', ''], correct_option_index: 0, difficulty: 'medium',
};

export default function AdminQuestions() {
  const [data, setData] = useState<Paginated<AdminQuestion> | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [page, setPage] = useState(1);
  const [filterCat, setFilterCat] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AdminQuestion>>(EMPTY);

  const load = useCallback((p: number) => {
    const filters: any = {};
    if (filterCat) filters.category_id = filterCat;
    if (filterDiff) filters.difficulty = filterDiff;
    adminApi.fetchQuestions(p, 20, filters).then(setData).catch(() => {});
  }, [filterCat, filterDiff]);

  useEffect(() => {
    load(page);
    adminApi.fetchCategories().then(setCategories).catch(() => {});
  }, [page, load]);

  const openCreate = () => { setEditing({ ...EMPTY, category_id: categories[0]?.id ?? '' }); setModalOpen(true); };
  const openEdit = (q: AdminQuestion) => { setEditing({ ...q, options: [...q.options] }); setModalOpen(true); };

  const save = async () => {
    if (editing.id) {
      await adminApi.updateQuestion(editing.id, editing);
    } else {
      await adminApi.createQuestion(editing);
    }
    setModalOpen(false);
    load(page);
  };

  const remove = async (id: string) => {
    await adminApi.deleteQuestion(id);
    load(page);
  };

  const setOption = (i: number, val: string) => {
    const opts = [...(editing.options ?? [])];
    opts[i] = val;
    setEditing({ ...editing, options: opts });
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <select className="admin-select" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="admin-select" value={filterDiff} onChange={e => { setFilterDiff(e.target.value); setPage(1); }}>
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button className="admin-btn" onClick={openCreate}>+ New Question</button>
      </div>
      {data && (
        <DataTable<AdminQuestion>
          columns={[
            { key: 'text', label: 'Question', render: q => q.text.length > 80 ? q.text.slice(0, 80) + '...' : q.text },
            { key: 'category', label: 'Category', render: q => q.category?.name ?? '-' },
            { key: 'difficulty', label: 'Difficulty' },
            { key: 'active', label: 'Active', render: q => q.active ? 'Yes' : 'No' },
            { key: 'actions', label: '', render: q => (
              <div className="admin-actions">
                <button className="admin-btn small" onClick={e => { e.stopPropagation(); openEdit(q); }}>Edit</button>
                <button className="admin-btn small danger" onClick={e => { e.stopPropagation(); remove(q.id); }}>Del</button>
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
      <Modal open={modalOpen} title={editing.id ? 'Edit Question' : 'New Question'} onClose={() => setModalOpen(false)}>
        <div className="admin-form">
          <label>Category
            <select className="admin-input" value={editing.category_id ?? ''} onChange={e => setEditing({ ...editing, category_id: e.target.value })}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Difficulty
            <select className="admin-input" value={editing.difficulty ?? 'medium'} onChange={e => setEditing({ ...editing, difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label>Question Text
            <textarea className="admin-input" rows={3} value={editing.text ?? ''} onChange={e => setEditing({ ...editing, text: e.target.value })} />
          </label>
          <fieldset className="admin-fieldset">
            <legend>Options</legend>
            {(editing.options ?? []).map((opt, i) => (
              <div key={i} className="admin-option-row">
                <input
                  type="radio"
                  name="correct"
                  checked={editing.correct_option_index === i}
                  onChange={() => setEditing({ ...editing, correct_option_index: i })}
                />
                <input className="admin-input" value={opt} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                {(editing.options?.length ?? 0) > 2 && (
                  <button className="admin-btn small danger" type="button" onClick={() => {
                    const opts = (editing.options ?? []).filter((_, j) => j !== i);
                    const ci = (editing.correct_option_index ?? 0) >= opts.length ? opts.length - 1 : editing.correct_option_index;
                    setEditing({ ...editing, options: opts, correct_option_index: ci });
                  }}>&times;</button>
                )}
              </div>
            ))}
            <button type="button" className="admin-btn small" onClick={() => setEditing({ ...editing, options: [...(editing.options ?? []), ''] })}>+ Add Option</button>
          </fieldset>
          <label>Source (optional)
            <input className="admin-input" value={editing.source ?? ''} onChange={e => setEditing({ ...editing, source: e.target.value })} />
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
