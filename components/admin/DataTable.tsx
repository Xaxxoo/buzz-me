'use client';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
}

function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j}><div className="admin-skeleton" style={{ height: 16, width: `${50 + Math.random() * 40}%` }} /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function DataTable<T extends { id: string }>({
  columns, data, total, page, limit, onPageChange, onRowClick, loading,
}: Props<T>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={columns.length} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="admin-table-empty">
                <div className="admin-empty">
                  <svg className="admin-empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>
                  </svg>
                  <div className="admin-empty-title">No data found</div>
                </div>
              </td>
            </tr>
          ) : data.map(item => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'clickable' : undefined}
            >
              {columns.map(c => (
                <td key={c.key}>
                  {c.render ? c.render(item) : String((item as any)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="admin-table-footer">
          <span>{total > 0 ? `${start}\u2013${end} of ${total.toLocaleString()}` : '\u00A0'}</span>
          <div className="admin-pagination">
            <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
