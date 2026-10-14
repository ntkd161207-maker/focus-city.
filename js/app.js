import { createWorld, OBJECT_TYPES, isInsideMap } from './world.js';
import { CityRenderer } from './renderer.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#city-canvas');
const world = createWorld();
const picker = $('#object-picker');
const inspector = $('#inspector');

for (const [category, target] of [['house','#house-count'],['tree','#tree-count']]) {
  $(target).textContent = world.objects.filter(object => OBJECT_TYPES[object.type].category === category).length;
}
$('#road-count').textContent = world.tiles.filter(tile => tile.terrain === 'road').length;
for (const object of world.objects) {
  const option = document.createElement('option');
  option.value = object.id;
  option.textContent = `${OBJECT_TYPES[object.type].label} · ${object.x}, ${object.y}`;
  picker.append(option);
}

try {
  const renderer = new CityRenderer(canvas,world);
  await renderer.loadAssets();
  renderer.resize();
  const observer = new ResizeObserver(() => { renderer.resize(); updateZoom(); });
  observer.observe(canvas);
  const pointers = new Map();
  let pinch = null;

  function updateZoom() {
    $('#zoom-label').value = `${Math.round(renderer.camera.zoom * 100)}%`;
    $('#zoom-in').disabled = renderer.camera.zoom >= renderer.maxZoom - 0.001;
    $('#zoom-out').disabled = renderer.camera.zoom <= renderer.minZoom + 0.001;
  }
  function localPoint(event) { const rect = canvas.getBoundingClientRect();return { x:event.clientX-rect.left,y:event.clientY-rect.top }; }
  function setSelected(object,focus = false) {
    renderer.selected = object;
    inspector.hidden = !object;
    picker.value = object?.id ?? '';
    if (object) {
      const type = OBJECT_TYPES[object.type];
      $('#selected-name').textContent = type.label;
      $('#selected-description').textContent = type.description;
      $('#selected-coordinate').textContent = `X ${object.x} / Y ${object.y}`;
      $('#selected-footprint').textContent = `${object.footprint.width} × ${object.footprint.height} ô`;
      $('#selected-id').textContent = object.id;
      if (focus) renderer.focusObject(object);
    }
    renderer.requestDraw();
  }
  function pinchState() {
    const [a,b] = [...pointers.values()];
    return { distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),x:(a.x+b.x)/2,y:(a.y+b.y)/2 };
  }
  canvas.addEventListener('pointerdown',event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    canvas.focus({preventScroll:true});
    canvas.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointers.set(event.pointerId,{...point,startX:point.x,startY:point.y,moved:false});
    if (pointers.size >= 2) { for (const point of pointers.values()) point.moved = true;pinch = pinchState(); }
  });
  canvas.addEventListener('pointermove',event => {
    const point = localPoint(event);
    const previous = pointers.get(event.pointerId);
    if (previous) {
      const dx = point.x-previous.x,dy=point.y-previous.y;
      const moved = previous.moved || Math.hypot(point.x-previous.startX,point.y-previous.startY)>4;
      pointers.set(event.pointerId,{...previous,...point,moved});
      if (pointers.size >= 2) {
        const next = pinchState();
        if (pinch) { renderer.zoomAt(next.distance/pinch.distance,pinch.x,pinch.y);renderer.pan(next.x-pinch.x,next.y-pinch.y);updateZoom(); }
        pinch = next;
      } else if (moved) { renderer.pan(dx,dy);canvas.classList.add('dragging'); }
    }
    const grid = renderer.tileAtScreen(point.x,point.y);
    renderer.hovered = isInsideMap(grid.x,grid.y) ? grid : null;
    $('#tile-coordinate').textContent = renderer.hovered ? `X ${grid.x} / Y ${grid.y}` : 'X — / Y —';
    renderer.requestDraw();
  });
  function releasePointer(event, cancelled = false) {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    if (!cancelled && !point.moved && pointers.size === 1) { const local=localPoint(event);setSelected(renderer.objectAtScreen(local.x,local.y)); }
    pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) canvas.classList.remove('dragging');
  }
  canvas.addEventListener('pointerup',event => releasePointer(event));
  canvas.addEventListener('pointercancel',event => releasePointer(event,true));
  canvas.addEventListener('lostpointercapture',event => releasePointer(event,true));
  canvas.addEventListener('pointerleave',() => { if (!pointers.size) { renderer.hovered=null;$('#tile-coordinate').textContent='X — / Y —';renderer.requestDraw(); } });
  canvas.addEventListener('wheel',event => { event.preventDefault();const point=localPoint(event);const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?renderer.height:1);renderer.zoomAt(Math.exp(-Math.max(-150,Math.min(150,delta))*.002),point.x,point.y);updateZoom(); },{passive:false});
  canvas.addEventListener('keydown',event => {
    const steps={ArrowLeft:[45,0],ArrowRight:[-45,0],ArrowUp:[0,45],ArrowDown:[0,-45]};
    if (steps[event.key]) renderer.pan(...steps[event.key]);
    else if (event.key==='+' || event.key==='=') renderer.zoomAt(1.2);
    else if (event.key==='-') renderer.zoomAt(1/1.2);
    else if (event.key==='Home') renderer.fit();
    else if (event.key==='Escape') setSelected(null);
    else return;
    event.preventDefault();updateZoom();
  });
  $('#zoom-in').addEventListener('click',() => { renderer.zoomAt(1.2);updateZoom(); });
  $('#zoom-out').addEventListener('click',() => { renderer.zoomAt(1/1.2);updateZoom(); });
  $('#reset-view').addEventListener('click',() => { renderer.fit();updateZoom(); });
  $('#grid-toggle').addEventListener('click',event => { renderer.showGrid=!renderer.showGrid;event.currentTarget.setAttribute('aria-pressed',String(renderer.showGrid));renderer.requestDraw(); });
  $('#close-inspector').addEventListener('click',() => setSelected(null));
  picker.addEventListener('change',() => setSelected(world.objects.find(object => object.id === picker.value) ?? null,true));
  updateZoom();
} catch (error) {
  console.error('City initialization failed:',error);
  $('#map-error').textContent = 'Không thể tải bản đồ. Hãy chạy máy chủ theo README, tải lại trang và kiểm tra các file trong thư mục assets.';
  $('#map-error').hidden = false;
  for (const button of document.querySelectorAll('.map-actions button,.zoom-control button')) button.disabled = true;
  picker.disabled = true;
}
