import * as T from "three";
export class EnvironmentResources {
  readonly box = new T.BoxGeometry(1, 1, 1);
  readonly flat = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  readonly trunk = new T.CylinderGeometry(0.16, 0.23, 1, 6);
  readonly crown = new T.IcosahedronGeometry(1, 1);
  readonly distantCrown = new T.IcosahedronGeometry(1, 0);
  readonly geometries: T.BufferGeometry[] = [
    this.box,
    this.flat,
    this.trunk,
    this.crown,
    this.distantCrown,
  ];
  readonly materials: T.Material[] = [];
  readonly textures: T.Texture[] = [];
  material(
    color: number,
    extra: Partial<T.MeshStandardMaterialParameters> = {},
  ) {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
    this.materials.push(m);
    return m;
  }
  readonly asphalt = this.material(0x454d51);
  readonly sidewalk = this.material(0xc4c2b5);
  readonly curb = this.material(0xe0ded2);
  readonly white = this.material(0xf0eee1);
  readonly yellow = this.material(0xd7b95b);
  readonly green = this.material(0x7d9664);
  readonly bark = this.material(0x6e6550);
  readonly leaves = this.material(0x486f48);
  readonly metal = this.material(0x47595a, { metalness: 0.4, roughness: 0.6 });
  readonly lamp = this.material(0xf5ebc8, {
    emissive: 0xe6dcb6,
    emissiveIntensity: 0.2,
  });
  readonly car = this.material(0xc8cfb9, { metalness: 0.25, roughness: 0.45 });
  readonly carRed = this.material(0x9d5546, {
    metalness: 0.25,
    roughness: 0.45,
  });
  readonly glass = this.material(0x456571, { metalness: 0.3, roughness: 0.3 });
  readonly tire = this.material(0x30383b);
  readonly proxyHome = this.material(0xccc5b1);
  readonly proxyTower = this.material(0x9caeb0);
  readonly proxyRoof = this.material(0x626f70);
  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#c6c3b8";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#aaa99f";
    ctx.lineWidth = 2;
    for (let y = 0; y <= 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      for (let x = y % 64 ? 16 : 0; x <= 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 32);
        ctx.stroke();
      }
    }
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 2;
    this.textures.push(tex);
    this.sidewalk.map = tex;
    this.sidewalk.needsUpdate = true;
  }
  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
