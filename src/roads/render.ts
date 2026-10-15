import * as T from "three";
import { Batches } from "../rendering/batches";
import { EnvironmentResources } from "../environment/resources";
import {
  ARTERIAL,
  horizontalStreet,
  intersectionCenters,
  isRoad,
  mod,
  verticalStreet,
} from "./layout";
import { cellToWorld } from "../world/grid";
import { CHUNK_CELLS, type CityChunk } from "../world/chunks";
export interface RoadMetrics {
  arterialTiles: number;
  crossings: number;
  lamps: number;
}
function cornerGeometry(r: number, w: number, cut = false) {
  const shape = new T.Shape();
  if (cut) {
    shape.moveTo(0, 0);
    shape.lineTo(r, 0);
    shape.quadraticCurveTo(0, 0, 0, -r);
    shape.lineTo(0, 0);
  } else {
    shape.moveTo(0, -r);
    shape.quadraticCurveTo(0, 0, r, 0);
    shape.lineTo(r, -w);
    shape.quadraticCurveTo(w, -w, w, -r);
    shape.lineTo(0, -r);
  }
  const geometry = new T.ShapeGeometry(shape, 10);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
export class RoadRenderer {
  private corner = cornerGeometry(2.2, 1.7);
  private cornerCut = cornerGeometry(2.2, 1.7, true);
  constructor(private resources: EnvironmentResources) {
    resources.geometries.push(this.corner, this.cornerCut);
  }
  build(chunks: CityChunk[], size: number, s: number, b: Batches): RoadMetrics {
    const r = this.resources,
      metrics = { arterialTiles: 0, crossings: 0, lamps: 0 };
    let detail = false;
    const box = (
      mat: T.Material,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      rot = 0,
    ) => {
      const flat =
        mat === r.asphalt ||
        mat === r.white ||
        mat === r.yellow ||
        mat === r.green ||
        (!detail && mat === r.curb);
      b.add(
        flat ? r.flat : r.box,
        mat,
        x,
        flat ? y + h / 2 : y,
        z,
        w,
        flat ? 1 : h,
        d,
        rot,
        false,
      );
    };
    for (const chunk of chunks) {
      detail = chunk.detail;
      const minX = chunk.x * CHUNK_CELLS,
        minZ = chunk.z * CHUNK_CELLS;
      for (let z = minZ; z < minZ + CHUNK_CELLS; z++)
        for (let x = minX; x < minX + CHUNK_CELLS; x++) {
          const p = cellToWorld({ x, z }, size, s),
            road = isRoad({ x, z });
          if (road) {
            box(r.asphalt, p.x, 0.025, p.z, s, 0.05, s);
            if (z >= 30 && z <= 33) metrics.arterialTiles++;
            const verticalCenter = 10.5 + Math.round((x - 10.5) / 24) * 24;
            const dx = Math.abs(x - verticalCenter) * s;
            if (z === ARTERIAL.first) {
              const center = cellToWorld({ x, z: ARTERIAL.center }, size, s).z;
              if (dx > 10) {
                box(r.curb, p.x, 0.12, center, s, 0.18, 1.2);
                box(r.green, p.x, 0.23, center, s, 0.1, 0.9);
              }
              if (dx > 11) {
                for (const off of [-7.6, 7.6])
                  box(r.white, p.x, 0.067, center + off, s, 0.018, 0.1);
                if (mod(x, 2) === 0)
                  for (const off of [-4.25, 4.25])
                    box(r.white, p.x, 0.069, center + off, s * 0.6, 0.02, 0.13);
              }
            }
            if (mod(z, 24) === 16 && dx > 8) {
              const center = cellToWorld({ x, z: z + 0.5 }, size, s).z;
              for (const off of [-3.7, 3.7])
                box(r.white, p.x, 0.067, center + off, s, 0.018, 0.09);
              if (mod(x, 2) === 0)
                box(r.yellow, p.x, 0.07, center, s * 0.6, 0.02, 0.12);
            }
            if (mod(x, 24) === 10) {
              const horizontalCenter = 16.5 + Math.round((z - 16.5) / 24) * 24;
              if (
                Math.abs(z - horizontalCenter) * s > 8 &&
                Math.abs(z - ARTERIAL.center) * s > 13
              ) {
                const center = cellToWorld({ x: x + 0.5, z }, size, s).x;
                for (const off of [-3.7, 3.7])
                  box(r.white, center + off, 0.067, p.z, 0.09, 0.018, s);
                if (mod(z, 2) === 0)
                  box(r.yellow, center, 0.07, p.z, 0.12, 0.02, s * 0.6);
              }
            }
            continue;
          }
          const left = verticalStreet(x - 1),
            right = verticalStreet(x + 1),
            top = horizontalStreet(z - 1),
            bottom = horizontalStreet(z + 1);
          const paving = chunk.detail ? r.sidewalk : r.curb;
          if (left || right) {
            const sx = left ? -1 : 1,
              trimA = top ? 2.2 : 0,
              trimB = bottom ? 2.2 : 0,
              len = s - trimA - trimB;
            if (len > 0) {
              box(
                paving,
                p.x + sx * (s / 2 - 0.86),
                0.12,
                p.z + (trimA - trimB) / 2,
                1.72,
                0.2,
                len,
              );
              box(
                r.curb,
                p.x + sx * (s / 2 - 0.08),
                0.16,
                p.z + (trimA - trimB) / 2,
                0.16,
                0.28,
                len,
              );
            }
          }
          if (top || bottom) {
            const sz = top ? -1 : 1,
              trimA = left ? 2.2 : 0,
              trimB = right ? 2.2 : 0,
              len = s - trimA - trimB;
            if (len > 0) {
              box(
                paving,
                p.x + (trimA - trimB) / 2,
                0.12,
                p.z + sz * (s / 2 - 0.86),
                len,
                0.2,
                1.72,
              );
              box(
                r.curb,
                p.x + (trimA - trimB) / 2,
                0.16,
                p.z + sz * (s / 2 - 0.08),
                len,
                0.28,
                0.16,
              );
            }
          }
          if ((left || right) && (top || bottom)) {
            const cx = p.x + (left ? -s / 2 : s / 2),
              cz = p.z + (top ? -s / 2 : s / 2),
              rotation = left
                ? top
                  ? 0
                  : Math.PI / 2
                : top
                  ? -Math.PI / 2
                  : Math.PI;
            b.add(
              this.cornerCut,
              r.asphalt,
              cx,
              0.06,
              cz,
              1,
              1,
              1,
              rotation,
              false,
            );
            b.add(this.corner, paving, cx, 0.235, cz, 1, 1, 1, rotation, false);
          }
          if (!chunk.detail) continue;
          if ((left || right) && !top && !bottom && mod(z, 8) === 2) {
            this.lamp(
              b,
              p.x + (left ? -1.1 : 1.1),
              p.z,
              left ? -Math.PI / 2 : Math.PI / 2,
            );
            metrics.lamps++;
          }
          if ((top || bottom) && !left && !right && mod(x, 8) === 2) {
            this.lamp(b, p.x, p.z + (top ? -1.1 : 1.1), top ? Math.PI : 0);
            metrics.lamps++;
          }
        }
      if (!chunk.detail) continue;
      for (const cross of intersectionCenters(
        minX,
        minX + CHUNK_CELLS,
        minZ,
        minZ + CHUNK_CELLS,
      )) {
        const p = cellToWorld(cross, size, s),
          half = cross.halfWidth * s;
        for (const side of [-1, 1]) {
          for (let d = -half + 0.65; d < half - 0.3; d += 0.95) {
            if (cross.halfWidth === 2 && Math.abs(d) < 0.9) continue;
            box(
              r.white,
              p.x + side * (s + 2.7),
              0.083,
              p.z + d,
              2.6,
              0.025,
              0.5,
            );
          }
          for (let d = -s + 0.6; d < s - 0.3; d += 0.95)
            box(
              r.white,
              p.x + d,
              0.083,
              p.z + side * (half + 2.7),
              0.5,
              0.025,
              2.6,
            );
          box(
            r.white,
            p.x + side * (s + 4.6),
            0.083,
            p.z + side * (half / 2),
            0.25,
            0.02,
            half - 1,
          );
          box(
            r.white,
            p.x + side * (s / 2),
            0.083,
            p.z + side * (half + 4.6),
            s - 1,
            0.02,
            0.25,
          );
        }
        metrics.crossings++;
      }
    }
    return metrics;
  }
  private lamp(b: Batches, x: number, z: number, rotation: number) {
    const r = this.resources;
    b.add(r.box, r.metal, x, 0.22, z, 0.5, 0.4, 0.5, 0, false);
    b.add(r.trunk, r.metal, x, 3.4, z, 0.48, 6.4, 0.48, 0, false);
    const dx = Math.sin(rotation) * 1.3,
      dz = Math.cos(rotation) * 1.3;
    b.add(
      r.box,
      r.metal,
      x + dx / 2,
      6.55,
      z + dz / 2,
      0.14,
      0.15,
      1.5,
      rotation,
      false,
    );
    b.add(
      r.box,
      r.lamp,
      x + dx,
      6.45,
      z + dz,
      0.55,
      0.18,
      1.1,
      rotation,
      false,
    );
  }
}
