// Admin Portal 2.0 — shared DataTable.
//
// A generic sortable, paginated table shell for the admin CMS's many
// literal <table> views (AdminViews.tsx, InsurerAdmin.tsx, …), each of
// which currently hand-rolls its own <thead>/<tbody>/sort/pagination. Sort
// and pagination logic live in dataTable.ts (pure, unit-tested); this file
// is presentation + the minimal state (current sort, current page) a
// caller doesn't want to re-implement per view.
//
// Deliberately generic over row shape (`T`) and column-driven (`columns`),
// so each admin view supplies its own columns/cell renderers and keeps its
// own data fetching — this component owns no gateway calls.
//
// Not yet wired into a production view: it ships ready for the
// module-by-module passes that follow this PR.
import React, { useMemo, useState } from 'react';
import { ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { nextSortState, paginate, sortRows, type SortState } from './dataTable';
import { AdminEmptyState } from '../adminUI';
import type { LucideIcon } from 'lucide-react';

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Omit to make the column unsortable (e.g. an actions column). */
  sortAccessor?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  pageSize?: number;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyHint?: string;
  /** Checkbox column for bulk actions. Omit to hide it entirely. */
  selection?: {
    selectedIds: ReadonlySet<string>;
    onToggle: (id: string) => void;
    onToggleAll: (ids: string[]) => void;
  };
}

const ALIGN_CLASS: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, loading, pageSize = 20,
  emptyIcon, emptyTitle, emptyHint, selection,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

  const columnById = useMemo(() => new Map(columns.map(c => [c.id, c])), [columns]);

  const sorted = useMemo(() => {
    if (!sort) return [...rows];
    const col = columnById.get(sort.columnId);
    if (!col?.sortAccessor) return [...rows];
    return sortRows(rows, sort, (row) => col.sortAccessor!(row));
  }, [rows, sort, columnById]);

  const { rows: pageRows, info } = useMemo(() => paginate(sorted, page, pageSize), [sorted, page, pageSize]);

  const toggleSort = (columnId: string) => setSort(prev => nextSortState(prev, columnId));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-4 border-ds-admin-forest/20 border-t-ds-admin-forest animate-spin" />
      </div>
    );
  }

  if (rows.length === 0 && emptyTitle && emptyIcon) {
    return <AdminEmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} />;
  }

  const pageIds = pageRows.map(rowKey);
  const allPageSelected = !!selection && pageIds.length > 0 && pageIds.every(id => selection.selectedIds.has(id));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-ds-border">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-ds-border bg-ds-card2 text-2xs uppercase tracking-wider text-ds-ink3">
              {selection && (
                <th className="w-10 py-2.5 pl-4">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => selection.onToggleAll(pageIds)}
                    aria-label="Pilih semua di halaman ini"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.id}
                  className={`py-2.5 px-3 font-black ${ALIGN_CLASS[col.align ?? 'left']} ${col.className ?? ''}`}
                >
                  {col.sortAccessor ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.id)}
                      className="group inline-flex items-center gap-1 transition-colors hover:text-ds-ink"
                    >
                      {col.header}
                      {sort?.columnId === col.id ? (
                        // Single icon that rotates on direction toggle, rather than
                        // swapping Up/Down icons, so the change actually animates.
                        <ArrowUp
                          size={11}
                          className={`transition-transform duration-150 ease-out ${sort.direction === 'asc' ? 'rotate-0' : 'rotate-180'}`}
                        />
                      ) : (
                        <ChevronsUpDown size={11} className="opacity-40 transition-opacity duration-150 group-hover:opacity-70" />
                      )}
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ds-border">
            {pageRows.map(row => {
              const id = rowKey(row);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={`text-xs ${onRowClick ? 'cursor-pointer transition-colors hover:bg-ds-card2' : ''}`}
                >
                  {selection && (
                    <td className="py-2.5 pl-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selection.selectedIds.has(id)}
                        onChange={() => selection.onToggle(id)}
                        aria-label="Pilih baris"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.id} className={`py-2.5 px-3 ${ALIGN_CLASS[col.align ?? 'left']} ${col.className ?? ''}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {info.total > pageSize && (
        <div className="flex items-center justify-between text-2xs font-bold text-ds-ink3">
          <span>
            {info.pageStart + 1}–{info.pageEnd} dari {info.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={info.page <= 1}
              aria-label="Halaman sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ds-card2 text-ds-ink3 transition-colors duration-150 disabled:opacity-30 hover:text-ds-ink hover:bg-ds-border/40"
            >
              <ChevronLeft size={14} />
            </button>
            <span>Hal. {info.page} / {info.pageCount}</span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(info.pageCount, p + 1))}
              disabled={info.page >= info.pageCount}
              aria-label="Halaman berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ds-card2 text-ds-ink3 transition-colors duration-150 disabled:opacity-30 hover:text-ds-ink hover:bg-ds-border/40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
