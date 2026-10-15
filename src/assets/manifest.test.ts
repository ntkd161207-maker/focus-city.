import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { manifest } from "./manifest";
import { BUILDINGS } from "../buildings/catalog";
describe("original GLB asset package", () => {
  it.each(manifest)("has valid embedded geometry and texture: $id", (entry) => {
    const b = readFileSync(`public/${entry.path}`);
    expect(b.readUInt32LE(0)).toBe(0x46546c67);
    expect(b.readUInt32LE(4)).toBe(2);
    expect(b.readUInt32LE(8)).toBe(b.length);
    const jsonLength = b.readUInt32LE(12);
    const g = JSON.parse(b.subarray(20, 20 + jsonLength).toString());
    const binaryLength = b.readUInt32LE(20 + jsonLength);
    expect(g.buffers[0].byteLength).toBe(binaryLength);
    for (const v of g.bufferViews)
      expect(v.byteOffset + v.byteLength).toBeLessThanOrEqual(binaryLength);
    expect(g.nodes.length).toBeGreaterThan(15);
    expect(g.images[0].mimeType).toBe("image/png");
    expect(
      g.materials.every(
        (m: { pbrMetallicRoughness: { baseColorTexture: unknown } }) =>
          m.pbrMetallicRoughness.baseColorTexture,
      ),
    ).toBe(true);
    expect(entry.metadata.placeholder).toBe(true);
  });
  it("resolves every building ID to a manifest asset", () => {
    for (const b of Object.values(BUILDINGS))
      expect(manifest.some((a) => a.id === b.asset)).toBe(true);
  });
});
