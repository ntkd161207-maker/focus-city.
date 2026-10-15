import * as T from "three";
interface Batch {
  geometry: T.BufferGeometry;
  material: T.Material | T.Material[];
  matrices: T.Matrix4[];
  shadow: boolean;
}
// Global aggregation retains a low draw-call count as the active chunk window grows.
export class Batches {
  private batches = new Map<string, Batch>();
  private dummy = new T.Object3D();
  add(
    geometry: T.BufferGeometry,
    material: T.Material | T.Material[],
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rotation = 0,
    shadow = true,
  ) {
    this.dummy.position.set(x, y, z);
    this.dummy.scale.set(sx, sy, sz);
    this.dummy.rotation.set(0, rotation, 0);
    this.dummy.updateMatrix();
    this.matrix(geometry, material, this.dummy.matrix, shadow);
  }
  matrix(
    geometry: T.BufferGeometry,
    material: T.Material | T.Material[],
    matrix: T.Matrix4,
    shadow = true,
  ) {
    const key =
      geometry.uuid +
      (Array.isArray(material)
        ? material.map((m) => m.uuid).join()
        : material.uuid) +
      shadow;
    if (!this.batches.has(key))
      this.batches.set(key, { geometry, material, matrices: [], shadow });
    this.batches.get(key)!.matrices.push(matrix.clone());
  }
  finish() {
    const group = new T.Group();
    this.batches.forEach((b) => {
      const mesh = new T.InstancedMesh(
        b.geometry,
        b.material,
        b.matrices.length,
      );
      b.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = b.shadow;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    });
    this.batches.clear();
    return group;
  }
}
export function disposeInstances(group: T.Group) {
  group.traverse((o) => {
    if (o instanceof T.InstancedMesh) o.dispose();
  });
  group.clear();
}
