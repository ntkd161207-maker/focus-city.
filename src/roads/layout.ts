import type { Cell } from "../world/grid";
export const STREET_PERIOD = 24;
export const ARTERIAL = {
  first: 30,
  last: 33,
  center: 31.5,
  lanes: 4,
  name: "Đại lộ Thống Nhất",
} as const;
export function mod(n: number, divisor: number) {
  return ((n % divisor) + divisor) % divisor;
}
export function verticalStreet(x: number) {
  return mod(x, STREET_PERIOD) === 10 || mod(x, STREET_PERIOD) === 11;
}
export function horizontalStreet(z: number) {
  return (
    (z >= ARTERIAL.first && z <= ARTERIAL.last) ||
    mod(z, STREET_PERIOD) === 16 ||
    mod(z, STREET_PERIOD) === 17
  );
}
export function isRoad({ x, z }: Cell) {
  return verticalStreet(x) || horizontalStreet(z);
}
export function roadType(cell: Cell) {
  return cell.z >= ARTERIAL.first && cell.z <= ARTERIAL.last
    ? "arterial"
    : isRoad(cell)
      ? "local"
      : null;
}
export function legacyRoad({ x, z }: Cell) {
  return [7, 15, 24].includes(x) || [8, 16, 25].includes(z);
}
export function intersectionCenters(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) {
  const result: { x: number; z: number; halfWidth: number }[] = [];
  for (
    let k = Math.floor((minX - 11) / 24);
    k <= Math.ceil((maxX - 10) / 24);
    k++
  ) {
    const x = 10.5 + k * 24;
    if (x < minX || x >= maxX) continue;
    for (
      let j = Math.floor((minZ - 17) / 24);
      j <= Math.ceil((maxZ - 16) / 24);
      j++
    ) {
      const z = 16.5 + j * 24;
      if (z >= minZ && z < maxZ) result.push({ x, z, halfWidth: 1 });
    }
    if (ARTERIAL.center >= minZ && ARTERIAL.center < maxZ)
      result.push({ x, z: ARTERIAL.center, halfWidth: 2 });
  }
  return result;
}
