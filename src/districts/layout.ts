import { BUILDINGS, footprint, type BuildingKind } from "../buildings/catalog";
import type { Building } from "../core/state";
import { ARTERIAL, isRoad } from "../roads/layout";
import { SERVICE_SITES } from "../services/catalog";
export function hash(x: number, z: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
export function occupiedCells(b: Building) {
  const f = footprint(b.kind, b.x, b.z),
    cells: string[] = [];
  for (let z = f.minZ; z <= f.maxZ; z++)
    for (let x = f.minX; x <= f.maxX; x++) cells.push(`${x},${z}`);
  return cells;
}
export function lotIsClear(kind: BuildingKind, x: number, z: number) {
  const f = footprint(kind, x, z);
  for (let cz = f.minZ; cz <= f.maxZ; cz++)
    for (let cx = f.minX; cx <= f.maxX; cx++)
      if (isRoad({ x: cx, z: cz })) return false;
  return true;
}
export function districtName(x: number, z: number) {
  return Math.abs(z - ARTERIAL.center) < 11 && Math.abs(x - 32) < 72
    ? "Trung tâm Thống Nhất"
    : z < ARTERIAL.center
      ? "Khu vườn phía Bắc"
      : "Khu phố phía Nam";
}
export function generateDistrict(
  minX: number,
  minZ: number,
  size: number,
): Building[] {
  const buildings: Building[] = [];
  const services = SERVICE_SITES.map((s) => ({
    ...s,
    id: `service-${s.kind}`,
    rotation: 0,
  }));
  const serviceCells = new Set(services.flatMap(occupiedCells));
  for (let z = Math.ceil((minZ - 2) / 4) * 4 + 2; z < minZ + size; z += 4)
    for (let x = Math.ceil((minX - 2) / 4) * 4 + 2; x < minX + size; x += 4) {
      const n = hash(x, z),
        distance = Math.abs(z - ARTERIAL.center);
      const kind: BuildingKind =
        distance < 11 && Math.abs(x - 32) < 22
          ? n % 3 === 0
            ? "tower"
            : "townhouse"
          : distance < 28
            ? "townhouse"
            : "cottage";
      if (!lotIsClear(kind, x, z)) continue;
      const b = {
        id: `lot-${x}-${z}`,
        kind,
        x,
        z,
        rotation: z < ARTERIAL.center ? 0 : Math.PI,
      };
      if (occupiedCells(b).some((c) => serviceCells.has(c))) continue;
      buildings.push(b);
    }
  buildings.push(
    ...services.filter(
      (b) =>
        b.x >= minX && b.x < minX + size && b.z >= minZ && b.z < minZ + size,
    ),
  );
  return buildings;
}
export function buildingAt(buildings: Building[], x: number, z: number) {
  return buildings.find((b) => {
    const f = footprint(b.kind, b.x, b.z);
    return x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ;
  });
}
export function buildingHeight(b: Building) {
  return BUILDINGS[b.kind].height;
}
