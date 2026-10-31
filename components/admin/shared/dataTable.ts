// Admin Portal 2.0 — DataTable's pure sort/paginate logic.
//
// Split out from the component so it can be unit-tested without React or
// jsdom (see services/__tests__/dataTable.test.ts). No admin view consumes
// DataTable yet — it ships ready for the module-by-module passes (Policy/
// Claims, Finance, Agents/Partners, Catalog, Platform) that follow.

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

/**
 * Toggle logic for clicking a column header: same column flips direction,
 * a different column starts ascending.
 */
export function nextSortState(current: SortState | null, columnId: string): SortState {
  if (current?.columnId === columnId) {
    return { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { columnId, direction: 'asc' };
}

export function sortRows<T>(
  rows: readonly T[],
  sort: SortState | null,
  accessor: (row: T, columnId: string) => string | number | null | undefined,
): T[] {
  if (!sort) return [...rows];
  const dir = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = accessor(a, sort.columnId);
    const bv = accessor(b, sort.columnId);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'id-ID') * dir;
  });
}

export interface PageInfo {
  page: number;
  pageCount: number;
  pageStart: number;
  pageEnd: number;
  total: number;
}

export function paginate<T>(rows: readonly T[], page: number, pageSize: number): { rows: T[]; info: PageInfo } {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  return {
    rows: rows.slice(pageStart, pageEnd),
    info: { page: safePage, pageCount, pageStart, pageEnd, total },
  };
}
