import {
  createState,
  type GameState,
  type LegacySnapshot,
} from "../core/state";
import { BUILDINGS, footprint } from "../buildings/catalog";
import { legacyRoad } from "../roads/layout";
import { lotIsClear, occupiedCells } from "../districts/layout";
export const DATABASE = "focus-city";
export class InvalidSaveError extends Error {}
function validate(input: unknown, legacy = false): GameState {
  if (!input || typeof input !== "object")
    throw new InvalidSaveError("Dữ liệu lưu không hợp lệ.");
  const s = input as GameState;
  if (s.version !== (legacy ? 1 : 2))
    throw new InvalidSaveError(
      "Phiên bản lưu chưa được hỗ trợ. Dữ liệu được giữ lại.",
    );
  if (
    !Number.isInteger(s.size) ||
    s.size < 1 ||
    s.size > 128 ||
    typeof s.cellSize !== "number" ||
    !Number.isFinite(s.cellSize) ||
    s.cellSize < 1 ||
    s.cellSize > 20 ||
    typeof s.grid !== "boolean" ||
    !["low", "medium", "high"].includes(s.quality) ||
    typeof s.focusMinutes !== "number" ||
    !Number.isFinite(s.focusMinutes) ||
    s.focusMinutes < 0 ||
    !Array.isArray(s.buildings) ||
    s.buildings.length > s.size ** 2
  )
    throw new InvalidSaveError("Dữ liệu lưu bị lỗi.");
  const ids = new Set<string>(),
    cells = new Set<string>();
  for (const b of s.buildings) {
    if (
      !b ||
      typeof b.id !== "string" ||
      !b.id ||
      ids.has(b.id) ||
      !Object.hasOwn(BUILDINGS, b.kind) ||
      !Number.isInteger(b.x) ||
      !Number.isInteger(b.z) ||
      b.x < 0 ||
      b.z < 0 ||
      b.x >= s.size ||
      b.z >= s.size ||
      typeof b.rotation !== "number" ||
      !Number.isFinite(b.rotation) ||
      (legacy &&
        (!["cottage", "townhouse", "tower"].includes(b.kind) ||
          legacyRoad(b))) ||
      (!legacy && !lotIsClear(b.kind, b.x, b.z))
    )
      throw new InvalidSaveError("Công trình trong bản lưu không hợp lệ.");
    const footprintCells = legacy ? [`${b.x},${b.z}`] : occupiedCells(b);
    if (footprintCells.some((c) => cells.has(c)))
      throw new InvalidSaveError("Ô xây dựng bị trùng.");
    if (!legacy) {
      const f = footprint(b.kind, b.x, b.z);
      if (f.minX < 0 || f.minZ < 0 || f.maxX >= s.size || f.maxZ >= s.size)
        throw new InvalidSaveError("Công trình nằm ngoài vùng lưu.");
    }
    footprintCells.forEach((c) => cells.add(c));
    ids.add(b.id);
  }
  if (!legacy && s.legacySnapshot) validate(s.legacySnapshot, true);
  return structuredClone(s);
}
export function migrateSave(input: unknown): GameState {
  if (
    input &&
    typeof input === "object" &&
    (input as { version?: number }).version === 1
  ) {
    const old = validate(input, true) as unknown as LegacySnapshot;
    const next = createState();
    next.grid = old.grid;
    next.quality = old.quality;
    next.focusMinutes = old.focusMinutes;
    const candidates = next.buildings.filter((b) =>
      ["cottage", "townhouse", "tower"].includes(b.kind),
    );
    if (candidates.length < old.buildings.length)
      throw new InvalidSaveError(
        "Bố cục mới chưa đủ chỗ chuyển bản lưu cũ. Dữ liệu gốc được giữ lại.",
      );
    const available = new Set(candidates);
    for (const b of old.buildings) {
      const x = b.x + (next.size - old.size) / 2,
        z = b.z + (next.size - old.size) / 2;
      const lot = [...available].sort(
        (a, b) =>
          (a.x - x) ** 2 + (a.z - z) ** 2 - ((b.x - x) ** 2 + (b.z - z) ** 2),
      )[0];
      available.delete(lot);
      lot.id = `legacy-${b.id}`;
      lot.kind = b.kind;
      lot.rotation = b.rotation;
    }
    next.legacySnapshot = old;
    return validate(next);
  }
  return validate(input);
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("saves");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(new Error("Hãy đóng tab Focus City cũ rồi thử lại."));
  });
}
async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("saves", mode);
    const request = operation(tx.objectStore("saves"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error ?? request.error ?? new Error("Không thể lưu dữ liệu."));
    };
  });
}
export async function saveGame(state: GameState) {
  await transact("readwrite", (s) => s.put(migrateSave(state), "main"));
}
export async function loadGame(): Promise<GameState> {
  const value = await transact("readonly", (s) => s.get("main"));
  return value === undefined ? createState() : migrateSave(value);
}
export async function resetGame() {
  const state = createState();
  await saveGame(state);
  return state;
}
