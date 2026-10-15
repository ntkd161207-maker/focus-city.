export const WORLD = { size: 64, cellSize: 4 } as const;
export type Quality = "low" | "medium" | "high";
export const QUALITY = {
  low: { pixelRatio: 1, shadows: false, shadowSize: 512 },
  medium: { pixelRatio: 1.5, shadows: true, shadowSize: 1024 },
  high: { pixelRatio: 2, shadows: true, shadowSize: 2048 },
} as const;
