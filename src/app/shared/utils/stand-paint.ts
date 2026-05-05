/**
 * Paint-grid stand designer model.
 *
 * Each cell either belongs to a zone (referenced by zoneKey), is the stage,
 * is blocked (aisle / structural), or is empty.
 *
 * Backend persists zones as rectangles {rows, cols, capacity}, so on save we
 * collapse painted cells to a bounding-box per zone. The full painted layout
 * is cached in localStorage keyed by eventId so the customer view can render
 * the same stand overview the admin designed.
 */
export type CellTool = 'EMPTY' | 'STAGE' | 'BLOCKED';
export type CellValue = CellTool | { kind: 'ZONE'; zoneKey: string };

export interface PaintedZoneStat {
  zoneKey: string;
  cellCount: number;
  bboxRows: number;
  bboxCols: number;
  minRow: number;
  minCol: number;
}

export type PaintGrid = CellValue[][];

export function makeEmptyGrid(rows: number, cols: number): PaintGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'EMPTY' as CellValue),
  );
}

export function resizeGrid(grid: PaintGrid, rows: number, cols: number): PaintGrid {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => grid[r]?.[c] ?? ('EMPTY' as CellValue)),
  );
}

export function setCell(
  grid: PaintGrid,
  row: number,
  col: number,
  value: CellValue,
): PaintGrid {
  if (row < 0 || row >= grid.length) return grid;
  if (col < 0 || col >= (grid[0]?.length ?? 0)) return grid;
  if (cellsEqual(grid[row][col], value)) return grid;
  const next = grid.map(r => r.slice());
  next[row] = next[row].slice();
  next[row][col] = value;
  return next;
}

export function cellsEqual(a: CellValue, b: CellValue): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return a.zoneKey === b.zoneKey;
}

export function isZoneCell(cell: CellValue, zoneKey: string): boolean {
  return typeof cell !== 'string' && cell.kind === 'ZONE' && cell.zoneKey === zoneKey;
}

export function computeZoneStats(grid: PaintGrid, zoneKeys: string[]): Map<string, PaintedZoneStat> {
  const stats = new Map<string, PaintedZoneStat>();
  zoneKeys.forEach(key =>
    stats.set(key, {
      zoneKey: key,
      cellCount: 0,
      bboxRows: 0,
      bboxCols: 0,
      minRow: Number.POSITIVE_INFINITY,
      minCol: Number.POSITIVE_INFINITY,
    }),
  );
  const maxRow = new Map<string, number>();
  const maxCol = new Map<string, number>();

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (typeof cell === 'string' || cell.kind !== 'ZONE') continue;
      const stat = stats.get(cell.zoneKey);
      if (!stat) continue;
      stat.cellCount += 1;
      if (r < stat.minRow) stat.minRow = r;
      if (c < stat.minCol) stat.minCol = c;
      maxRow.set(cell.zoneKey, Math.max(maxRow.get(cell.zoneKey) ?? -1, r));
      maxCol.set(cell.zoneKey, Math.max(maxCol.get(cell.zoneKey) ?? -1, c));
    }
  }

  stats.forEach(stat => {
    if (stat.cellCount === 0) {
      stat.minRow = 0;
      stat.minCol = 0;
      return;
    }
    stat.bboxRows = (maxRow.get(stat.zoneKey) ?? 0) - stat.minRow + 1;
    stat.bboxCols = (maxCol.get(stat.zoneKey) ?? 0) - stat.minCol + 1;
  });

  return stats;
}

export interface SerializedStand {
  rows: number;
  cols: number;
  // Run-length encoded rows for compactness in localStorage.
  // Each cell is encoded as: 'E' empty, 'S' stage, 'B' blocked, or 'Z:<zoneKey>'.
  cells: string[][];
}

export function serializeStand(grid: PaintGrid): SerializedStand {
  return {
    rows: grid.length,
    cols: grid[0]?.length ?? 0,
    cells: grid.map(row =>
      row.map(cell => {
        if (cell === 'EMPTY') return 'E';
        if (cell === 'STAGE') return 'S';
        if (cell === 'BLOCKED') return 'B';
        return `Z:${cell.zoneKey}`;
      }),
    ),
  };
}

export function deserializeStand(data: SerializedStand): PaintGrid {
  return data.cells.map(row =>
    row.map<CellValue>(token => {
      if (token === 'E') return 'EMPTY';
      if (token === 'S') return 'STAGE';
      if (token === 'B') return 'BLOCKED';
      if (token.startsWith('Z:')) return { kind: 'ZONE', zoneKey: token.slice(2) };
      return 'EMPTY';
    }),
  );
}

const STORAGE_PREFIX = 'ticketrush.stand.';

export function saveStandToStorage(eventKey: string, grid: PaintGrid): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + eventKey, JSON.stringify(serializeStand(grid)));
  } catch {
    // Quota or disabled storage — non-fatal.
  }
}

export function loadStandFromStorage(eventKey: string): PaintGrid | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + eventKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SerializedStand;
    if (!parsed?.cells?.length) return null;
    return deserializeStand(parsed);
  } catch {
    return null;
  }
}
