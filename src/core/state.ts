import { WORLD, type Quality } from "./config";
import type { BuildingKind } from "../buildings/catalog";
import { generateDistrict } from "../districts/layout";
export interface Building {
  id: string;
  kind: BuildingKind;
  x: number;
  z: number;
  rotation: number;
}
export interface LegacySnapshot {
  version: 1;
  size: number;
  cellSize: number;
  buildings: Building[];
  grid: boolean;
  quality: Quality;
  focusMinutes: number;
}
export interface GameState {
  version: 2;
  size: number;
  cellSize: number;
  buildings: Building[];
  grid: boolean;
  quality: Quality;
  focusMinutes: number;
  legacySnapshot?: LegacySnapshot;
}
export function createState(): GameState {
  return {
    version: 2,
    ...WORLD,
    buildings: generateDistrict(0, 0, WORLD.size),
    grid: false,
    quality: "medium",
    focusMinutes: 0,
  };
}
