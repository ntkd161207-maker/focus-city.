import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, MAP_SIZE, OBJECT_TYPES, gridToWorld, worldToGrid, isInsideMap } from '../js/world.js';

test('20×20 grid has unique coordinates, valid boundaries and reversible projection',() => {
  const world = createWorld();
  assert.equal(world.tiles.length,400);
  assert.equal(new Set(world.tiles.map(tile=>`${tile.x},${tile.y}`)).size,400);
  for (const tile of world.tiles) {
    assert.ok(isInsideMap(tile.x,tile.y));
    const projected=gridToWorld(tile.x,tile.y);
    assert.deepEqual(worldToGrid(projected.x,projected.y),{x:tile.x,y:tile.y});
    assert.equal(world.tileAt(tile.x,tile.y),tile);
  }
  for (const [x,y] of [[-1,0],[0,-1],[MAP_SIZE,0],[0,MAP_SIZE],[.5,1]]) assert.equal(isInsideMap(x,y),false);
  assert.equal(world.tileAt(20,0),null);
});
test('buildings and trees have independent IDs, footprints and unoccupied road tiles',() => {
  const world=createWorld();
  assert.equal(world.objects.filter(o=>OBJECT_TYPES[o.type].category==='house').length,21);
  assert.equal(world.objects.filter(o=>o.type==='tree').length,32);
  assert.equal(new Set(world.objects.map(o=>o.id)).size,world.objects.length);
  assert.equal(world.occupied.size,world.objects.length);
  for (const object of world.objects) {
    assert.ok(OBJECT_TYPES[object.type]);assert.ok(isInsideMap(object.x,object.y));
    assert.equal(world.objectAt(object.x,object.y),object);
    assert.notEqual(world.tileAt(object.x,object.y).terrain,'road');
    assert.deepEqual(object.footprint,{width:1,height:1});
    assert.equal('screenX' in object,false);
  }
  assert.equal(world.objectAt(-1,0),null);
});
test('all road tiles belong to one connected network',() => {
  const world=createWorld();const roads=world.tiles.filter(tile=>tile.terrain==='road');
  assert.ok(roads.length>0);
  const queue=[roads[0]];const visited=new Set();
  while (queue.length) {
    const tile=queue.pop();const key=`${tile.x},${tile.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) { const next=world.tileAt(tile.x+dx,tile.y+dy);if (next?.terrain==='road' && !visited.has(`${next.x},${next.y}`)) queue.push(next); }
  }
  assert.equal(visited.size,roads.length);
});
