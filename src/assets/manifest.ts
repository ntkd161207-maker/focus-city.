export interface AssetEntry {
  id: string;
  type: "glb" | "gltf";
  path: string;
  metadata: {
    placeholder: boolean;
    license: string;
    unit: string;
    forward: string;
    lodPaths: string[];
  };
}
export const manifest: AssetEntry[] = [
  "cottage",
  "townhouse",
  "tower",
  "school",
  "clinic",
  "fire",
  "police",
  "market",
  "park",
].map((id) => ({
  id,
  type: "glb",
  path: `assets/models/${id}.glb`,
  metadata: {
    placeholder: true,
    license: "CC0-1.0, generated for Focus City",
    unit: "meter",
    forward: "+Z",
    lodPaths: [],
  },
}));
export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}
