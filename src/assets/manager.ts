import { Group, Mesh, Texture, type Material, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { assetUrl, manifest } from "./manifest";
export class AssetManager {
  private loader = new GLTFLoader();
  private models = new Map<string, Group>();
  private pending = new Map<string, Promise<Group>>();
  private disposed = false;
  async load(id: string): Promise<Group> {
    if (this.disposed) throw new Error("Asset manager đã đóng.");
    if (this.models.has(id)) return this.models.get(id)!;
    if (this.pending.has(id)) return this.pending.get(id)!;
    const entry = manifest.find((a) => a.id === id);
    if (!entry) throw new Error(`Không tìm thấy asset: ${id}`);
    const task = this.loader
      .loadAsync(assetUrl(entry.path))
      .then((gltf) => {
        gltf.scene.traverse((o) => {
          if (o instanceof Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        this.models.set(id, gltf.scene);
        if (this.disposed) {
          this.dispose();
          throw new Error("Asset manager đã đóng.");
        }
        return gltf.scene;
      })
      .catch(() => {
        throw new Error(
          `Không tải được mô hình ${id}. Kiểm tra kết nối và đường dẫn asset.`,
        );
      })
      .finally(() => this.pending.delete(id));
    this.pending.set(id, task);
    return task;
  }
  instance(id: string): Object3D {
    const model = this.models.get(id);
    if (!model) throw new Error(`Asset chưa được tải: ${id}`);
    return clone(model); // Geometry, materials and textures are shared; no per-instance GPU allocations.
  }
  dispose() {
    this.disposed = true;
    const geometries = new Set<Mesh["geometry"]>();
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    this.models.forEach((model) =>
      model.traverse((o) => {
        if (o instanceof Mesh) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      }),
    );
    materials.forEach((m) => {
      Object.values(m).forEach((value) => {
        if (value instanceof Texture) textures.add(value);
      });
      m.dispose();
    });
    textures.forEach((t) => {
      const images: unknown[] = Array.isArray(t.source.data)
        ? t.source.data
        : [t.source.data];
      images.forEach((image) => {
        if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap)
          image.close();
      });
      t.dispose();
    });
    geometries.forEach((g) => g.dispose());
    this.models.clear();
  }
}
