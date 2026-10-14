import { MAP_SIZE, TILE_WIDTH, TILE_HEIGHT, OBJECT_TYPES, gridToWorld, worldToGrid } from './world.js';

const GRASS = ['#aebe8c','#b2c18e','#a9ba85','#b4c391','#adbd89','#b0c08b','#b7c595'];
export class CityRenderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('Trình duyệt không hỗ trợ Canvas 2D.');
    this.world = world;
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.minZoom = 0.3;
    this.maxZoom = 2.5;
    this.showGrid = false;
    this.hovered = null;
    this.selected = null;
    this.assets = new Map();
    this.frame = null;
    this.sortedObjects = [...world.objects].sort((a,b) => a.x + a.y - b.x - b.y || a.x - b.x);
    this.width = 0;
    this.height = 0;
  }
  async loadAssets() {
    await Promise.all(Object.entries(OBJECT_TYPES).map(async ([type, definition]) => {
      const image = new Image();
      image.src = new URL(`../${definition.asset}`, import.meta.url).href;
      await image.decode();
      this.assets.set(type, image);
    }));
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const previousWidth = this.width;
    const previousHeight = this.height;
    this.width = rect.width;
    this.height = rect.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!previousWidth) this.fit();
    else {
      this.camera.x += (this.width - previousWidth) / 2;
      this.camera.y += (this.height - previousHeight) / 2;
      this.constrain();
    }
    this.requestDraw();
  }
  fit() {
    this.camera.zoom = Math.max(this.minZoom, Math.min(1.1, (this.width - 65) / (MAP_SIZE * TILE_WIDTH), (this.height - 190) / (MAP_SIZE * TILE_HEIGHT + 75)));
    this.camera.x = this.width / 2;
    this.camera.y = this.height / 2 + 30 - (MAP_SIZE - 1) * TILE_HEIGHT / 2 * this.camera.zoom;
    this.requestDraw();
  }
  constrain() {
    // Keep the center of the island reachable, even after an enthusiastic drag.
    const zoom = this.camera.zoom;
    this.camera.x = Math.max(40 - MAP_SIZE * TILE_WIDTH / 2 * zoom, Math.min(this.width - 40 + MAP_SIZE * TILE_WIDTH / 2 * zoom, this.camera.x));
    this.camera.y = Math.max(40 - (MAP_SIZE - 1) * TILE_HEIGHT * zoom, Math.min(this.height - 40, this.camera.y));
  }
  zoomAt(factor, x = this.width / 2, y = this.height / 2) {
    const old = this.camera.zoom;
    const next = Math.max(this.minZoom, Math.min(this.maxZoom, old * factor));
    this.camera.x = x - (x - this.camera.x) * next / old;
    this.camera.y = y - (y - this.camera.y) * next / old;
    this.camera.zoom = next;
    this.constrain();
    this.requestDraw();
  }
  pan(dx, dy) { this.camera.x += dx; this.camera.y += dy; this.constrain(); this.requestDraw(); }
  toWorld(x, y) { return { x: (x - this.camera.x) / this.camera.zoom, y: (y - this.camera.y) / this.camera.zoom }; }
  tileAtScreen(x, y) { const point = this.toWorld(x, y); return worldToGrid(point.x, point.y); }
  objectAtScreen(x, y) {
    const point = this.toWorld(x,y);
    // Reverse painter order and test actual SVG alpha, so transparent corners never swallow clicks.
    for (let i = this.sortedObjects.length - 1; i >= 0; i--) {
      const object = this.sortedObjects[i];
      const def = OBJECT_TYPES[object.type];
      const position = gridToWorld(object.x, object.y);
      const left = position.x - def.width / 2;
      const top = position.y + 8 - def.height * def.anchor;
      if (point.x < left || point.x > left + def.width || point.y < top || point.y > top + def.height) continue;
      if (!this.hitCanvas) { this.hitCanvas = document.createElement('canvas'); this.hitCanvas.width = 128; this.hitCanvas.height = 160; this.hitContext = this.hitCanvas.getContext('2d', { willReadFrequently: true }); }
      this.hitContext.clearRect(0,0,128,160);
      this.hitContext.drawImage(this.assets.get(object.type),0,0,128,160);
      const px = Math.min(127, Math.floor((point.x - left) / def.width * 128));
      const py = Math.min(159, Math.floor((point.y - top) / def.height * 160));
      if (this.hitContext.getImageData(px,py,1,1).data[3] > 30) return object;
    }
    const grid = worldToGrid(point.x,point.y);
    return this.world.objectAt(grid.x,grid.y);
  }
  focusObject(object) {
    const point = gridToWorld(object.x,object.y);
    this.camera.x = this.width / 2 - point.x * this.camera.zoom;
    this.camera.y = this.height / 2 + 20 - point.y * this.camera.zoom;
    this.requestDraw();
  }
  requestDraw() {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => { this.frame = null; this.draw(); });
  }
  diamond(x,y,fill,stroke) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.moveTo(x,y-16);ctx.lineTo(x+32,y);ctx.lineTo(x,y+16);ctx.lineTo(x-32,y);ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.6; ctx.stroke(); }
  }
  roads() {
    const ctx = this.ctx;
    const roads = this.world.tiles.filter(tile => tile.terrain === 'road');
    // Stroke the connected network in one pass, avoiding seams/caps at tile boundaries.
    const segment = (width,color) => {
      ctx.beginPath();
      for (const tile of roads) {
        const point = gridToWorld(tile.x,tile.y);
        for (const [dx,dy] of [[1,0],[0,1]]) {
          if (this.world.tileAt(tile.x+dx,tile.y+dy)?.terrain !== 'road') continue;
          ctx.moveTo(point.x,point.y);ctx.lineTo(point.x+(dx-dy)*32,point.y+(dx+dy)*16);
        }
      }
      ctx.lineWidth = width;ctx.strokeStyle = color;ctx.lineCap = 'round';ctx.lineJoin = 'round';ctx.stroke();
    };
    segment(24,'#efead5');segment(19,'#929c94');
    ctx.setLineDash([3,5]);segment(.8,'#dbe0cf');ctx.setLineDash([]);
    // Crossing markings at intersections.
    for (const tile of roads) {
      const neighbors = [[-1,0],[1,0],[0,-1],[0,1]].filter(([dx,dy]) => this.world.tileAt(tile.x+dx,tile.y+dy)?.terrain === 'road');
      if (neighbors.length >= 3) {
        const point = gridToWorld(tile.x,tile.y);
        ctx.strokeStyle='#ebe9d6';ctx.lineWidth=1.4;
        for (let i=0;i<4;i++) { const offset=i*3;ctx.beginPath();ctx.moveTo(point.x-12+offset,point.y+1+offset/2);ctx.lineTo(point.x-7+offset,point.y-1.5+offset/2);ctx.stroke(); }
      }
    }
  }
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.width,this.height);
    ctx.save();ctx.translate(this.camera.x,this.camera.y);ctx.scale(this.camera.zoom,this.camera.zoom);
    const half = MAP_SIZE * TILE_WIDTH / 2;
    const farY = (MAP_SIZE - 1) * TILE_HEIGHT + TILE_HEIGHT / 2;
    // A shallow soil plinth gives the entire map physical depth.
    ctx.save();ctx.shadowColor='#425e3530';ctx.shadowBlur=35;ctx.shadowOffsetY=20;
    ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(half,(MAP_SIZE-1)*16);ctx.lineTo(0,farY);ctx.lineTo(-half,(MAP_SIZE-1)*16);ctx.closePath();ctx.fillStyle='#9baa7b';ctx.fill();ctx.restore();
    ctx.beginPath();ctx.moveTo(-half,(MAP_SIZE-1)*16);ctx.lineTo(0,farY);ctx.lineTo(0,farY+13);ctx.lineTo(-half,(MAP_SIZE-1)*16+13);ctx.closePath();ctx.fillStyle='#89966c';ctx.fill();
    ctx.beginPath();ctx.moveTo(0,farY);ctx.lineTo(half,(MAP_SIZE-1)*16);ctx.lineTo(half,(MAP_SIZE-1)*16+13);ctx.lineTo(0,farY+13);ctx.closePath();ctx.fillStyle='#75865d';ctx.fill();
    for (const tile of this.world.tiles) {
      const p = gridToWorld(tile.x,tile.y);
      this.diamond(p.x,p.y,GRASS[tile.shade]);
      if (tile.terrain === 'road') this.diamond(p.x,p.y,'#c8c8ad');
      if (tile.terrain === 'park') { this.diamond(p.x,p.y,'#d4cfac');ctx.strokeStyle='#b9b999';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(p.x-20,p.y-6);ctx.lineTo(p.x+15,p.y+11);ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x-25,p.y);ctx.stroke(); }
      if (tile.terrain === 'grass' && !this.world.objectAt(tile.x,tile.y) && tile.shade % 3 === 0) { ctx.strokeStyle='#839e6945';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(p.x-5,p.y);ctx.lineTo(p.x-6,p.y-3);ctx.moveTo(p.x-4,p.y);ctx.lineTo(p.x-2,p.y-2);ctx.stroke(); }
    }
    this.roads();
    if (this.showGrid) for (const tile of this.world.tiles) { const p=gridToWorld(tile.x,tile.y);this.diamond(p.x,p.y,null,'#526e5555'); }
    for (const object of this.sortedObjects) {
      const p = gridToWorld(object.x,object.y);
      if (object === this.selected) { this.diamond(p.x,p.y,'#eef6c980','#f9ffe5');ctx.strokeStyle='#426c46';ctx.lineWidth=1.5;ctx.stroke(); }
      ctx.save();ctx.translate(p.x+8,p.y+6);ctx.scale(1,.45);ctx.beginPath();ctx.ellipse(0,0,object.type==='tree'?19:29,12,0,0,Math.PI*2);ctx.fillStyle='#3b523b26';ctx.fill();ctx.restore();
      const def=OBJECT_TYPES[object.type];
      ctx.drawImage(this.assets.get(object.type),p.x-def.width/2,p.y+8-def.height*def.anchor,def.width,def.height);
    }
    if (this.hovered && !this.world.objectAt(this.hovered.x,this.hovered.y)) { const p=gridToWorld(this.hovered.x,this.hovered.y);this.diamond(p.x,p.y,'#edf7dc28','#f4f9e2'); }
    ctx.restore();
  }
}
