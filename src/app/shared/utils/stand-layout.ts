export interface StandZoneInput {
  rows: number | null;
  cols: number | null;
}

export interface PlacedZone<T extends StandZoneInput> {
  zone: T;
  index: number;
  startRow: number;
  startCol: number;
  rows: number;
  cols: number;
}

export interface StandLayout<T extends StandZoneInput> {
  standRows: number;
  standCols: number;
  zones: PlacedZone<T>[];
  overflow: boolean;
}

/**
 * Compute a left-to-right, top-to-bottom auto-layout of zones within a stand
 * of the given column width. Zones flow onto a new "band" when they don't fit
 * horizontally. The stand height is the maximum band bottom.
 *
 * Marked overflow=true when any zone is wider than the stand cols.
 */
export function computeStandLayout<T extends StandZoneInput>(
  zones: T[],
  standCols: number,
  minStandRows = 0,
): StandLayout<T> {
  const placed: PlacedZone<T>[] = [];
  let overflow = false;
  let cursorRow = 0;
  let cursorCol = 0;
  let bandHeight = 0;

  zones.forEach((zone, index) => {
    const rows = Math.max(1, zone.rows ?? 1);
    const cols = Math.max(1, zone.cols ?? 1);
    if (cols > standCols) overflow = true;

    if (cursorCol + cols > standCols && cursorCol > 0) {
      cursorRow += bandHeight;
      cursorCol = 0;
      bandHeight = 0;
    }

    placed.push({
      zone,
      index,
      startRow: cursorRow,
      startCol: cursorCol,
      rows,
      cols,
    });

    cursorCol += cols;
    if (rows > bandHeight) bandHeight = rows;
  });

  const usedRows = cursorRow + bandHeight;
  return {
    standRows: Math.max(minStandRows, usedRows),
    standCols,
    zones: placed,
    overflow,
  };
}
