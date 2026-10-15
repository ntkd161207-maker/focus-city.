import type { Building, GameState } from "../core/state";
import { generateDistrict } from "../districts/layout";
export const CHUNK_CELLS = 32;
export const CHUNK_RADIUS = 3;
export interface CityChunk {
  key: string;
  x: number;
  z: number;
  detail: boolean;
  buildings: Building[];
}
// Deterministic surroundings, bounded active set and eviction. No saved data lives in this cache.
export class ChunkManager {
  private cache = new Map<string, Building[]>();
  private signature = "";
  chunks: CityChunk[] = [];
  revision = 0;
  constructor(private state: GameState) {}
  update(worldX: number, worldZ: number, force = false) {
    const cx = Math.floor(
      (worldX / this.state.cellSize + this.state.size / 2) / CHUNK_CELLS,
    );
    const cz = Math.floor(
      (worldZ / this.state.cellSize + this.state.size / 2) / CHUNK_CELLS,
    );
    const signature = `${cx},${cz}`;
    if (!force && signature === this.signature) return false;
    this.signature = signature;
    const active = new Set<string>(),
      next: CityChunk[] = [];
    for (let z = cz - CHUNK_RADIUS; z <= cz + CHUNK_RADIUS; z++)
      for (let x = cx - CHUNK_RADIUS; x <= cx + CHUNK_RADIUS; x++) {
        const key = `${x},${z}`;
        active.add(key);
        const minX = x * CHUNK_CELLS,
          minZ = z * CHUNK_CELLS;
        let buildings = this.cache.get(key);
        if (!buildings) {
          buildings = generateDistrict(minX, minZ, CHUNK_CELLS).filter(
            (b) =>
              b.x < 0 ||
              b.z < 0 ||
              b.x >= this.state.size ||
              b.z >= this.state.size,
          );
          buildings.push(
            ...this.state.buildings.filter(
              (b) =>
                Math.floor(b.x / CHUNK_CELLS) === x &&
                Math.floor(b.z / CHUNK_CELLS) === z,
            ),
          );
          this.cache.set(key, buildings);
        }
        next.push({
          key,
          x,
          z,
          detail: Math.abs(x - cx) <= 1 && Math.abs(z - cz) <= 1,
          buildings,
        });
      }
    for (const key of this.cache.keys())
      if (!active.has(key)) this.cache.delete(key);
    this.chunks = next;
    this.revision++;
    return true;
  }
  replaceState(state: GameState) {
    this.state = state;
    this.cache.clear();
    this.signature = "";
  }
  get bounds() {
    const xs = this.chunks.map((c) => c.x),
      zs = this.chunks.map((c) => c.z);
    return {
      minX: Math.min(...xs) * CHUNK_CELLS,
      maxX: (Math.max(...xs) + 1) * CHUNK_CELLS,
      minZ: Math.min(...zs) * CHUNK_CELLS,
      maxZ: (Math.max(...zs) + 1) * CHUNK_CELLS,
    };
  }
  get cacheSize() {
    return this.cache.size;
  }
  get center() {
    return this.signature;
  }
  dispose() {
    this.cache.clear();
    this.chunks = [];
  }
}
