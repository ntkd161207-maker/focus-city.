export type Zone =
  "empty" | "residential" | "commercial" | "office" | "road" | "park" | "civic";
export interface Cell {
  x: number;
  z: number;
}
export function worldToCell(
  x: number,
  z: number,
  size: number,
  cellSize: number,
): Cell | null {
  const col = Math.floor((x + (size * cellSize) / 2) / cellSize);
  const row = Math.floor((z + (size * cellSize) / 2) / cellSize);
  return Number.isFinite(col) &&
    Number.isFinite(row) &&
    col >= 0 &&
    row >= 0 &&
    col < size &&
    row < size
    ? { x: col, z: row }
    : null;
}
export function cellToWorld(cell: Cell, size: number, cellSize: number) {
  return {
    x: (cell.x + 0.5 - size / 2) * cellSize,
    z: (cell.z + 0.5 - size / 2) * cellSize,
  };
}

// Streaming coordinates are intentionally unbounded; finite worldToCell remains for legacy saves.
export function worldToGlobalCell(
  x: number,
  z: number,
  size: number,
  cellSize: number,
): Cell | null {
  return Number.isFinite(x) && Number.isFinite(z)
    ? {
        x: Math.floor(x / cellSize + size / 2),
        z: Math.floor(z / cellSize + size / 2),
      }
    : null;
}
