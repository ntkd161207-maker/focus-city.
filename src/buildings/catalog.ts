import { SERVICES } from "../services/catalog";
export const BUILDINGS = {
  cottage: {
    name: "Nhà vườn",
    zone: "residential",
    asset: "cottage",
    height: 8,
    scale: 2.2,
    width: 3,
    depth: 3,
  },
  townhouse: {
    name: "Nhà phố",
    zone: "commercial",
    asset: "townhouse",
    height: 14,
    scale: 2.2,
    width: 3,
    depth: 3,
  },
  tower: {
    name: "Văn phòng",
    zone: "office",
    asset: "tower",
    height: 29,
    scale: 2.2,
    width: 3,
    depth: 3,
  },
  ...SERVICES,
} as const;
export type BuildingKind = keyof typeof BUILDINGS;
export function footprint(kind: BuildingKind, x: number, z: number) {
  const def = BUILDINGS[kind];
  return {
    minX: x - Math.floor(def.width / 2),
    maxX: x + Math.floor(def.width / 2),
    minZ: z - Math.floor(def.depth / 2),
    maxZ: z + Math.floor(def.depth / 2),
  };
}
