import { describe, it, expect } from 'vitest';
import { nextSortState, paginate, sortRows } from '../../components/admin/shared/dataTable';

describe('nextSortState', () => {
  it('starts ascending on a new column', () => {
    expect(nextSortState(null, 'name')).toEqual({ columnId: 'name', direction: 'asc' });
  });

  it('flips direction on the same column', () => {
    const asc = nextSortState(null, 'name');
    const desc = nextSortState(asc, 'name');
    expect(desc).toEqual({ columnId: 'name', direction: 'desc' });
    expect(nextSortState(desc, 'name')).toEqual({ columnId: 'name', direction: 'asc' });
  });

  it('resets to ascending when switching columns', () => {
    const nameDesc = nextSortState(nextSortState(null, 'name'), 'name');
    expect(nextSortState(nameDesc, 'amount')).toEqual({ columnId: 'amount', direction: 'asc' });
  });
});

describe('sortRows', () => {
  const rows = [
    { id: 'a', amount: 300, label: 'Charlie' },
    { id: 'b', amount: 100, label: 'alice' },
    { id: 'c', amount: 200, label: 'Bob' },
  ];
  const accessor = (row: typeof rows[number], col: string) => (row as any)[col];

  it('returns a copy, unsorted, when sort is null', () => {
    const result = sortRows(rows, null, accessor);
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  it('sorts numbers ascending and descending', () => {
    expect(sortRows(rows, { columnId: 'amount', direction: 'asc' }, accessor).map(r => r.id))
      .toEqual(['b', 'c', 'a']);
    expect(sortRows(rows, { columnId: 'amount', direction: 'desc' }, accessor).map(r => r.id))
      .toEqual(['a', 'c', 'b']);
  });

  it('sorts strings case-insensitively via localeCompare', () => {
    expect(sortRows(rows, { columnId: 'label', direction: 'asc' }, accessor).map(r => r.id))
      .toEqual(['b', 'c', 'a']); // alice, Bob, Charlie
  });

  it('pushes null/undefined values to the end regardless of direction', () => {
    const withGaps = [
      { id: 'x', v: 5 }, { id: 'y', v: null }, { id: 'z', v: 1 },
    ];
    const acc = (r: typeof withGaps[number], c: string) => (r as any)[c];
    expect(sortRows(withGaps, { columnId: 'v', direction: 'asc' }, acc).map(r => r.id)).toEqual(['z', 'x', 'y']);
    expect(sortRows(withGaps, { columnId: 'v', direction: 'desc' }, acc).map(r => r.id)).toEqual(['x', 'z', 'y']);
  });
});

describe('paginate', () => {
  const rows = Array.from({ length: 45 }, (_, i) => i);

  it('slices the first page correctly', () => {
    const { rows: page, info } = paginate(rows, 1, 20);
    expect(page).toEqual(rows.slice(0, 20));
    expect(info).toEqual({ page: 1, pageCount: 3, pageStart: 0, pageEnd: 20, total: 45 });
  });

  it('slices a partial last page correctly', () => {
    const { rows: page, info } = paginate(rows, 3, 20);
    expect(page).toEqual(rows.slice(40, 45));
    expect(info.pageStart).toBe(40);
    expect(info.pageEnd).toBe(45);
  });

  it('clamps an out-of-range page to the last valid page', () => {
    const { info } = paginate(rows, 99, 20);
    expect(info.page).toBe(3);
  });

  it('clamps a page below 1 up to 1', () => {
    const { info } = paginate(rows, 0, 20);
    expect(info.page).toBe(1);
  });

  it('never reports fewer than 1 page, even for an empty list', () => {
    const { rows: page, info } = paginate([], 1, 20);
    expect(page).toEqual([]);
    expect(info.pageCount).toBe(1);
    expect(info.total).toBe(0);
  });
});
