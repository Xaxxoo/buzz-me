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
}

export default function DataTable<T extends { id: string }>({
  columns, data, total, page, limit, onPageChange, onRowClick,
}: Props<T>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="admin-table-empty">No data</td></tr>
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
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
