import * as T from "three";
import { AssetManager } from "../assets/manager";
import { BUILDINGS } from "../buildings/catalog";
import { CameraController } from "../camera/controller";
import { QUALITY, type Quality } from "../core/config";
import { GameLoop } from "../core/loop";
import type { GameState } from "../core/state";
import {
  cellToWorld,
  worldToGlobalCell,
  type Cell,
  type Zone,
} from "../world/grid";
import { ARTERIAL, isRoad, roadType } from "../roads/layout";
import { ChunkManager } from "../world/chunks";
import { RoadRenderer, type RoadMetrics } from "../roads/render";
import { EnvironmentResources } from "../environment/resources";
import { decorate } from "../environment/decoration";
import { Batches, disposeInstances } from "./batches";
import { buildingAt, districtName } from "../districts/layout";
import { ServiceLabels } from "../services/labels";
import type { ServiceKind } from "../services/catalog";
export interface Stats {
  fps: number;
  calls: number;
  triangles: number;
  camera: string;
  chunks: number;
  chunkCenter: string;
  revision: number;
  buildings: number;
  crossings: number;
  lamps: number;
}
export interface Selection extends Cell {
  zone: Zone;
  label: string;
  district: string;
}
export class CityEngine {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private assets = new AssetManager();
  private camera: CameraController;
  private loop: GameLoop;
  private resize: ResizeObserver;
  private sun = new T.DirectionalLight(0xfff2da, 3);
  private ground: T.Mesh;
  private grid: T.GridHelper;
  private hover: T.Mesh;
  private selection: T.Mesh;
  private city = new T.Group();
  private resources = new EnvironmentResources();
  private roads = new RoadRenderer(this.resources);
  private chunks: ChunkManager;
  private labels: ServiceLabels | null = null;
  private raycaster = new T.Raycaster();
  private cursor = new T.Vector2();
  private elapsed = 0;
  private frames = 0;
  private dead = false;
  private assetsReady = false;
  private pointerStart = { x: 0, y: 0 };
  private selected: Cell | null = null;
  private metrics: RoadMetrics = { arterialTiles: 0, crossings: 0, lamps: 0 };
  constructor(
    private host: HTMLElement,
    private state: GameState,
    private onStats: (s: Stats) => void,
    private onSelect: (s: Selection | null) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0xc9d7d3);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Bản đồ thành phố 3D");
    this.renderer.domElement.dataset.testid = "city-canvas";
    host.append(this.renderer.domElement);
    this.camera = new CameraController(
      this.renderer.domElement,
      state.size * state.cellSize,
    );
    this.chunks = new ChunkManager(state);
    this.scene.fog = new T.Fog(0xc9d7d3, 450, 800);
    this.scene.add(new T.HemisphereLight(0xe1f0ff, 0x7e8769, 1.9));
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, {
      left: -180,
      right: 180,
      top: 180,
      bottom: -180,
      near: 1,
      far: 650,
    });
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.1;
    this.scene.add(this.sun, this.sun.target);
    this.ground = new T.Mesh(
      new T.PlaneGeometry(4096, 4096),
      new T.MeshStandardMaterial({ color: 0x8fa17b, roughness: 1 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.18;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.grid = new T.GridHelper(32 * state.cellSize, 32, 0xd4ddb9, 0xafc096);
    this.grid.position.y = 0.075;
    this.grid.visible = state.grid;
    this.scene.add(this.grid);
    const cellGeometry = new T.PlaneGeometry(
      state.cellSize * 0.96,
      state.cellSize * 0.96,
    );
    this.resources.geometries.push(cellGeometry);
    this.hover = new T.Mesh(
      cellGeometry,
      new T.MeshBasicMaterial({
        color: 0xe8df9f,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    this.selection = new T.Mesh(
      cellGeometry,
      new T.MeshBasicMaterial({
        color: 0xf8d875,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    this.resources.materials.push(
      this.hover.material as T.Material,
      this.selection.material as T.Material,
    );
    for (const m of [this.hover, this.selection]) {
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.38;
      m.visible = false;
      this.scene.add(m);
    }
    this.scene.add(this.city);
    this.setQuality(state.quality);
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointermove", this.pointerMove);
    canvas.addEventListener("pointerleave", this.pointerLeave);
    canvas.addEventListener("pointerdown", this.pointerDown);
    canvas.addEventListener("pointerup", this.pointerUp);
    this.resize = new ResizeObserver(this.resizeView);
    this.resize.observe(host);
    this.resizeView();
    this.loop = new GameLoop((dt) => {
      this.camera.update();
      const target = this.camera.controls.target;
      this.ground.position.x = target.x;
      this.ground.position.z = target.z;
      if (this.assetsReady && this.chunks.update(target.x, target.z))
        this.rebuild();
      const distance = this.camera.controls.getDistance();
      const fog = this.scene.fog as T.Fog;
      fog.near = distance + 100;
      fog.far = distance + 330;
      this.sun.position.set(target.x - 110, 200, target.z + 130);
      this.sun.target.position.set(target.x, 0, target.z);
      this.sun.target.updateMatrixWorld();
      this.labels?.update(
        this.camera.camera,
        this.host.clientWidth,
        this.host.clientHeight,
      );
      this.renderer.render(this.scene, this.camera.camera);
      this.elapsed += dt;
      this.frames++;
      if (this.elapsed >= 0.75) {
        this.onStats({
          fps: Math.round(this.frames / this.elapsed),
          calls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          camera: this.camera.camera.position
            .toArray()
            .map((v) => v.toFixed(1))
            .join(","),
          chunks: this.chunks.chunks.length,
          chunkCenter: this.chunks.center,
          revision: this.chunks.revision,
          buildings: this.chunks.chunks.reduce(
            (a, c) => a + c.buildings.length,
            0,
          ),
          crossings: this.metrics.crossings,
          lamps: this.metrics.lamps,
        });
        this.elapsed = 0;
        this.frames = 0;
      }
    });
    this.loop.start();
  }
  async load() {
    await Promise.all(
      [...new Set(Object.values(BUILDINGS).map((b) => b.asset))].map((id) =>
        this.assets.load(id),
      ),
    );
    if (this.dead) return;
    this.assetsReady = true;
    this.setBuildings(this.state);
    this.host.dataset.ready = "true";
  }
  private rebuild() {
    disposeInstances(this.city);
    const b = new Batches();
    const { size, cellSize: s } = this.state;
    this.metrics = this.roads.build(this.chunks.chunks, size, s, b);
    decorate(this.chunks.chunks, size, s, b, this.resources);
    for (const chunk of this.chunks.chunks)
      for (const building of chunk.buildings) {
        const def = BUILDINGS[building.kind],
          p = cellToWorld(building, size, s);
        if (
          !chunk.detail ||
          Math.hypot(
            p.x - this.camera.controls.target.x,
            p.z - this.camera.controls.target.z,
          ) > 145
        ) {
          if (building.kind === "park") continue;
          const h = def.height;
          b.add(
            this.resources.box,
            building.kind === "tower"
              ? this.resources.proxyTower
              : this.resources.proxyHome,
            p.x,
            h / 2 + 0.12,
            p.z,
            def.width * s * 0.65,
            h,
            def.depth * s * 0.65,
            building.rotation,
            false,
          );
          b.add(
            this.resources.box,
            this.resources.proxyRoof,
            p.x,
            h + 0.22,
            p.z,
            def.width * s * 0.69,
            0.3,
            def.depth * s * 0.69,
            building.rotation,
            false,
          );
          continue;
        }
        const object = this.assets.instance(def.asset);
        object.position.set(p.x, 0.1, p.z);
        object.rotation.y = building.rotation;
        object.scale.setScalar((def.scale * s) / 4);
        object.updateMatrixWorld(true);
        object.traverse((o) => {
          if (o instanceof T.Mesh)
            b.matrix(o.geometry, o.material, o.matrixWorld, true);
        });
      }
    const group = b.finish();
    while (group.children.length) this.city.add(group.children[0]);
    const center = this.camera.controls.target;
    const chunkMeters = 32 * s;
    this.grid.position.set(
      Math.floor(center.x / chunkMeters) * chunkMeters + chunkMeters / 2,
      0.08,
      Math.floor(center.z / chunkMeters) * chunkMeters + chunkMeters / 2,
    );
    this.host.dataset.chunkCenter = this.chunks.center;
    this.host.dataset.chunkCount = String(this.chunks.chunks.length);
    this.host.dataset.chunkRevision = String(this.chunks.revision);
    this.host.dataset.arterialTiles = String(this.metrics.arterialTiles);
    this.host.dataset.crossings = String(this.metrics.crossings);
    this.host.dataset.lamps = String(this.metrics.lamps);
    if (this.selected) this.select(this.selected);
  }
  setBuildings(state: GameState) {
    this.state = state;
    this.chunks.replaceState(state);
    this.chunks.update(
      this.camera.controls.target.x,
      this.camera.controls.target.z,
      true,
    );
    if (this.assetsReady) this.rebuild();
    this.labels?.dispose();
    this.labels = new ServiceLabels(
      this.host,
      state.buildings,
      state.size,
      state.cellSize,
      (b) => this.select(b),
    );
  }
  setGrid(value: boolean) {
    this.grid.visible = value;
  }
  setQuality(value: Quality) {
    const q = QUALITY[value];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pixelRatio));
    this.renderer.shadowMap.enabled = q.shadows;
    this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(
          (m) => (m.needsUpdate = true),
        );
    });
    this.resizeView();
  }
  clearSelection() {
    this.select(null);
  }
  resetCamera() {
    this.camera.reset();
  }
  exploreEast() {
    const t = this.camera.controls.target;
    this.camera.focus(t.x + 128, t.z);
  }
  focusBoulevard() {
    this.camera.focus(8, 0, true);
    this.select({ x: 34, z: 31 });
  }
  focusService(kind: ServiceKind) {
    const building = this.state.buildings.find((b) => b.kind === kind);
    if (!building) return;
    const p = cellToWorld(building, this.state.size, this.state.cellSize);
    this.camera.focus(p.x, p.z, true);
    this.select(building);
  }
  private resizeView = () => {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.camera.aspect = w / h;
    this.camera.camera.updateProjectionMatrix();
  };
  private hit(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.cursor.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.cursor, this.camera.camera);
    const point = this.raycaster.intersectObject(this.ground)[0]?.point;
    return point
      ? worldToGlobalCell(
          point.x,
          point.z,
          this.state.size,
          this.state.cellSize,
        )
      : null;
  }
  private pointerMove = (e: PointerEvent) => {
    const cell = this.hit(e);
    this.hover.visible = !!cell;
    if (cell) {
      const p = cellToWorld(cell, this.state.size, this.state.cellSize);
      this.hover.position.set(p.x, 0.38, p.z);
    }
  };
  private pointerLeave = () => {
    this.hover.visible = false;
  };
  private pointerDown = (e: PointerEvent) => {
    this.pointerStart = { x: e.clientX, y: e.clientY };
  };
  private pointerUp = (e: PointerEvent) => {
    if (
      e.button === 0 &&
      Math.hypot(
        e.clientX - this.pointerStart.x,
        e.clientY - this.pointerStart.y,
      ) < 5
    )
      this.select(this.hit(e));
  };
  private select(cell: Cell | null) {
    this.selected = cell;
    this.selection.visible = !!cell;
    if (!cell) {
      this.onSelect(null);
      return;
    }
    const p = cellToWorld(cell, this.state.size, this.state.cellSize);
    this.selection.position.set(p.x, 0.38, p.z);
    const building = buildingAt(
      this.chunks.chunks.flatMap((c) => c.buildings),
      cell.x,
      cell.z,
    );
    this.onSelect({
      ...cell,
      zone: isRoad(cell)
        ? "road"
        : building
          ? BUILDINGS[building.kind].zone
          : "empty",
      label:
        roadType(cell) === "arterial"
          ? ARTERIAL.name
          : isRoad(cell)
            ? "Đường khu dân cư"
            : building
              ? BUILDINGS[building.kind].name
              : "Không gian xanh",
      district: districtName(cell.x, cell.z),
    });
  }
  dispose() {
    this.dead = true;
    this.loop.stop();
    this.resize.disconnect();
    this.camera.dispose();
    const c = this.renderer.domElement;
    c.removeEventListener("pointermove", this.pointerMove);
    c.removeEventListener("pointerleave", this.pointerLeave);
    c.removeEventListener("pointerdown", this.pointerDown);
    c.removeEventListener("pointerup", this.pointerUp);
    disposeInstances(this.city);
    this.labels?.dispose();
    this.chunks.dispose();
    this.assets.dispose();
    this.resources.dispose();
    this.ground.geometry.dispose();
    (this.ground.material as T.Material).dispose();
    this.grid.geometry.dispose();
    (Array.isArray(this.grid.material)
      ? this.grid.material
      : [this.grid.material]
    ).forEach((m) => m.dispose());
    this.sun.shadow.dispose();
    this.renderer.dispose();
    c.remove();
  }
}
