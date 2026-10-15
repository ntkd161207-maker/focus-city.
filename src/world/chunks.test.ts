import { describe, it, expect } from "vitest";
import { createState } from "../core/state";
import { migrateSave } from "../persistence/storage";
import { ChunkManager, CHUNK_RADIUS } from "./chunks";
import { generateDistrict, occupiedCells } from "../districts/layout";
import { cellToWorld, worldToGlobalCell } from "./grid";
import { isRoad, intersectionCenters } from "../roads/layout";
import { SERVICE_SITES } from "../services/catalog";
describe("planned city and chunk streaming", () => {
  it("has a continuous four-cell arterial from west to east and connecting streets", () => {
    for (let x = -160; x <= 160; x++)
      for (let z = 30; z <= 33; z++) expect(isRoad({ x, z })).toBe(true);
    for (let z = -120; z <= 160; z++) expect(isRoad({ x: 34, z })).toBe(true);
    const centers = intersectionCenters(0, 64, 0, 64);
    expect(centers.some((c) => c.z === 31.5 && c.halfWidth === 2)).toBe(true);
  });
  it("has nonoverlapping lots, six services and no buildings in roads", () => {
    const state = createState();
    expect(() => migrateSave(state)).not.toThrow();
    for (const site of SERVICE_SITES)
      expect(state.buildings.some((b) => b.kind === site.kind)).toBe(true);
    const cells = new Set<string>();
    for (const b of state.buildings)
      for (const key of occupiedCells(b)) {
        expect(cells.has(key)).toBe(false);
        cells.add(key);
        const [x, z] = key.split(",").map(Number);
        expect(isRoad({ x, z })).toBe(false);
      }
  });
  it("generates identical districts across negative coordinates and chunk seams", () => {
    const whole = generateDistrict(-64, -64, 128).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const parts = [];
    for (let z = -64; z < 64; z += 32)
      for (let x = -64; x < 64; x += 32)
        parts.push(...generateDistrict(x, z, 32));
    expect(parts.sort((a, b) => a.id.localeCompare(b.id))).toEqual(whole);
    for (const cell of [
      { x: -150, z: 80 },
      { x: 1000, z: -1234 },
    ]) {
      const p = cellToWorld(cell, 64, 4);
      expect(worldToGlobalCell(p.x, p.z, 64, 4)).toEqual(cell);
    }
  });
  it("streams new chunks, evicts old ones, preserves core modifications and returns deterministically", () => {
    const state = createState();
    const removed = state.buildings[0];
    state.buildings.shift();
    const manager = new ChunkManager(state);
    expect(manager.update(0, 0)).toBe(true);
    const count = (CHUNK_RADIUS * 2 + 1) ** 2;
    expect(manager.chunks).toHaveLength(count);
    expect(
      manager.chunks
        .flatMap((c) => c.buildings)
        .some((b) => b.id === removed.id),
    ).toBe(false);
    const snapshot = structuredClone(manager.chunks);
    expect(manager.update(1, 1)).toBe(false);
    for (let i = 1; i < 100; i++) {
      expect(manager.update(i * 128, -i * 128)).toBe(true);
      expect(manager.cacheSize).toBe(count);
      expect(manager.chunks.filter((c) => c.detail)).toHaveLength(9);
    }
    manager.update(0, 0);
    expect(manager.chunks).toEqual(snapshot);
    expect(manager.revision).toBe(101);
    manager.dispose();
    expect(manager.cacheSize).toBe(0);
  });
});
