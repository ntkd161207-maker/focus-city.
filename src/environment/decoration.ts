import type { Batches } from "../rendering/batches";
import type { EnvironmentResources } from "./resources";
import { CHUNK_CELLS, type CityChunk } from "../world/chunks";
import { cellToWorld } from "../world/grid";
import {
  ARTERIAL,
  horizontalStreet,
  mod,
  verticalStreet,
} from "../roads/layout";
import { hash } from "../districts/layout";
export function decorate(
  chunks: CityChunk[],
  size: number,
  s: number,
  b: Batches,
  r: EnvironmentResources,
) {
  const tree = (x: number, z: number, h = 4, detail = true) => {
    b.add(r.trunk, r.bark, x, h * 0.3, z, 1, h * 0.6, 1, 0, false);
    b.add(
      detail ? r.crown : r.distantCrown,
      r.leaves,
      x,
      h * 0.76,
      z,
      h * 0.4,
      h * 0.53,
      h * 0.4,
      0,
      detail,
    );
  };
  for (const chunk of chunks) {
    const minX = chunk.x * CHUNK_CELLS,
      minZ = chunk.z * CHUNK_CELLS;
    for (let z = minZ; z < minZ + CHUNK_CELLS; z++)
      for (let x = minX; x < minX + CHUNK_CELLS; x++) {
        if (verticalStreet(x) || horizontalStreet(z)) continue;
        const p = cellToWorld({ x, z }, size, s);
        if (
          mod(z, 6) === 1 &&
          (verticalStreet(x - 1) || verticalStreet(x + 1)) &&
          !horizontalStreet(z - 1) &&
          !horizontalStreet(z + 1)
        )
          tree(
            p.x + (verticalStreet(x - 1) ? -1.05 : 1.05),
            p.z,
            chunk.detail ? 4.4 : 3.8,
            chunk.detail,
          );
        if (
          mod(x, 6) === 1 &&
          (horizontalStreet(z - 1) || horizontalStreet(z + 1)) &&
          !verticalStreet(x - 1) &&
          !verticalStreet(x + 1)
        )
          tree(
            p.x,
            p.z + (horizontalStreet(z - 1) ? -1.05 : 1.05),
            chunk.detail ? 4.4 : 3.8,
            chunk.detail,
          );
      }
    if (!chunk.detail) continue;
    for (let x = minX; x < minX + CHUNK_CELLS; x++) {
      const crossing = 10.5 + Math.round((x - 10.5) / 24) * 24;
      if (
        ARTERIAL.center < minZ ||
        ARTERIAL.center >= minZ + CHUNK_CELLS ||
        Math.abs(x - crossing) * s < 13
      )
        continue;
      const p = cellToWorld({ x, z: ARTERIAL.center }, size, s);
      if (mod(x, 6) === 0) tree(p.x, p.z, 3.6);
      if (mod(x, 5) === 1)
        car(
          b,
          r,
          p.x,
          p.z + (hash(x, 0) % 2 === 0 ? -5.8 : 5.8),
          Math.PI / 2,
          hash(x, 0) % 3 === 0,
        );
    }
    for (const building of chunk.buildings) {
      const p = cellToWorld(building, size, s);
      if (building.kind === "park")
        for (const dx of [-6.4, 6.4])
          for (const dz of [-6.4, 6.4]) tree(p.x + dx, p.z + dz, 5.2);
      if (building.kind === "cottage") {
        b.add(r.box, r.green, p.x, 0.08, p.z, 10.5, 0.13, 10.5, 0, false);
        b.add(r.box, r.sidewalk, p.x, 0.18, p.z + 4.4, 1.25, 0.08, 3, 0, false);
      }
      if (
        ["clinic", "police", "fire", "market", "school"].includes(building.kind)
      ) {
        for (let i = -1; i <= 1; i++) {
          b.add(
            r.box,
            r.white,
            p.x + i * 3,
            0.335,
            p.z + 6.8,
            0.1,
            0.015,
            2.5,
            0,
            false,
          );
        }
      }
    }
  }
}
function car(
  b: Batches,
  r: EnvironmentResources,
  x: number,
  z: number,
  rot: number,
  red: boolean,
) {
  b.add(r.box, red ? r.carRed : r.car, x, 0.72, z, 1.8, 0.65, 4.1, rot, true);
  b.add(r.box, r.glass, x, 1.23, z, 1.55, 0.57, 2.3, rot, true);
  b.add(r.box, red ? r.carRed : r.car, x, 1.55, z, 1.55, 0.1, 2.1, rot, false);
  const dx = Math.cos(rot),
    dz = -Math.sin(rot);
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      b.add(
        r.box,
        r.tire,
        x + side * 0.9 * dx + end * 1.25 * Math.sin(rot),
        0.4,
        z + side * 0.9 * dz + end * 1.25 * Math.cos(rot),
        0.24,
        0.55,
        0.7,
        rot,
        false,
      );
}
