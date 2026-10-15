import { describe, expect, it } from "vitest";
import { cellToWorld, worldToCell } from "./grid";
describe("grid coordinates", () => {
  it.each([1, 4, 7.5])(
    "round trips all 1024 cell centers at scale %s",
    (scale) => {
      for (let x = 0; x < 32; x++)
        for (let z = 0; z < 32; z++) {
          const p = cellToWorld({ x, z }, 32, scale);
          expect(worldToCell(p.x, p.z, 32, scale)).toEqual({ x, z });
        }
    },
  );
  it("rejects outer edges and invalid input", () => {
    expect(worldToCell(64, 0, 32, 4)).toBeNull();
    expect(worldToCell(-64.01, 0, 32, 4)).toBeNull();
    expect(worldToCell(NaN, 0, 32, 4)).toBeNull();
    expect(worldToCell(-64, -64, 32, 4)).toEqual({ x: 0, z: 0 });
  });
});
