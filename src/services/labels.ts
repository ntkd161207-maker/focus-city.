import { PerspectiveCamera, Vector3 } from "three";
import { SERVICES, type ServiceKind } from "./catalog";
import { cellToWorld } from "../world/grid";
import type { Building } from "../core/state";
export class ServiceLabels {
  private labels: { element: HTMLButtonElement; position: Vector3 }[] = [];
  private layer = document.createElement("div");
  constructor(
    host: HTMLElement,
    buildings: Building[],
    size: number,
    s: number,
    onSelect: (b: Building) => void,
  ) {
    this.layer.className = "service-label-layer";
    host.append(this.layer);
    buildings
      .filter((b) => Object.hasOwn(SERVICES, b.kind))
      .forEach((b) => {
        const def = SERVICES[b.kind as ServiceKind],
          p = cellToWorld(b, size, s),
          element = document.createElement("button");
        element.className = "map-service-label";
        element.dataset.testid = `map-service-${b.kind}`;
        element.title = def.name;
        element.setAttribute("aria-label", def.name);
        const dot = document.createElement("span");
        dot.style.background = def.color;
        dot.textContent = def.symbol;
        element.append(dot, document.createTextNode(def.shortName));
        element.onclick = () => onSelect(b);
        this.layer.append(element);
        this.labels.push({
          element,
          position: new Vector3(p.x, def.height + 2, p.z),
        });
      });
  }
  update(camera: PerspectiveCamera, w: number, h: number) {
    for (const label of this.labels) {
      const p = label.position.clone().project(camera),
        visible =
          p.z > -1 && p.z < 1 && Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.94;
      label.element.hidden = !visible;
      if (visible)
        label.element.style.transform = `translate(${(p.x * 0.5 + 0.5) * w}px,${(-p.y * 0.5 + 0.5) * h}px) translate(-50%,-100%)`;
    }
  }
  dispose() {
    this.layer.remove();
    this.labels = [];
  }
}
