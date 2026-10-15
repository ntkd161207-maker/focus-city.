import { PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export class CameraController {
  readonly camera = new PerspectiveCamera(42, 1, 0.5, 2500);
  readonly controls: OrbitControls;
  constructor(
    canvas: HTMLCanvasElement,
    private extent: number,
  ) {
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 28;
    this.controls.maxDistance = 620;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = Math.PI / 2.65;
    this.controls.maxTargetRadius = 32768;
    this.controls.screenSpacePanning = false;
    this.reset();
  }
  private move(target: Vector3, offset: Vector3) {
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.target.copy(target);
    this.camera.position.copy(target).add(offset);
    this.controls.update();
    this.controls.enableDamping = true;
  }
  reset() {
    this.move(
      new Vector3(),
      new Vector3(this.extent * 0.56, this.extent * 0.65, this.extent * 0.72),
    );
  }
  focus(x: number, z: number, close = false) {
    this.move(
      new Vector3(x, 0, z),
      close ? new Vector3(59, 72, 82) : new Vector3(85, 105, 115),
    );
  }
  update() {
    this.controls.target.y = 0;
    this.controls.update();
  }
  dispose() {
    this.controls.dispose();
  }
}
