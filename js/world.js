/** World data uses grid coordinates only; camera/screen coordinates stay in renderer.js. */
export const MAP_SIZE = 20;
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export const OBJECT_TYPES = Object.freeze({
  cottage: { label: 'Nhà vườn', description: 'Mái ngói ấm, cửa sổ lớn và một khoảng xanh trước hiên.', asset: 'assets/house-cottage.svg', width: 70, height: 87.5, anchor: 144 / 160, category: 'house' },
  townhouse: { label: 'Nhà phố', description: 'Ngôi nhà hai tầng với mái xanh và những ô cửa đón nắng.', asset: 'assets/house-townhouse.svg', width: 70, height: 87.5, anchor: 144 / 160, category: 'house' },
  tree: { label: 'Cây tán rộng', description: 'Một bóng mát nhỏ giữa những con phố. Không gian xanh của thành phố.', asset: 'assets/tree.svg', width: 50, height: 62.5, anchor: 140 / 160, category: 'tree' },
});

export function gridToWorld(x, y) {
  return { x: (x - y) * TILE_WIDTH / 2, y: (x + y) * TILE_HEIGHT / 2 };
}

export function worldToGrid(x, y) {
  return { x: Math.floor(x / TILE_WIDTH + y / TILE_HEIGHT + 0.5), y: Math.floor(y / TILE_HEIGHT - x / TILE_WIDTH + 0.5) };
}

export function isInsideMap(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE;
}

export function createWorld() {
  const tiles = Array.from({ length: MAP_SIZE * MAP_SIZE }, (_, index) => ({
    x: index % MAP_SIZE, y: Math.floor(index / MAP_SIZE), terrain: 'grass',
    shade: ((index % MAP_SIZE) * 17 + Math.floor(index / MAP_SIZE) * 31) % 7,
  }));
  const tileAt = (x, y) => isInsideMap(x, y) ? tiles[y * MAP_SIZE + x] : null;
  // A connected street network, surrounding a quiet central park.
  for (const tile of tiles) {
    const { x, y } = tile;
    if ((x === 5 || x === 14) && y >= 2 && y <= 17 || (y === 5 || y === 14) && x >= 2 && x <= 17 || y === 10 && x >= 5 && x <= 14) tile.terrain = 'road';
    else if (x >= 7 && x <= 12 && y >= 7 && y <= 8 || x === 9 && y >= 7 && y <= 9) tile.terrain = 'park';
  }
  const objects = [];
  const occupied = new Map();
  const add = (type, x, y) => {
    if (!OBJECT_TYPES[type] || !isInsideMap(x, y)) throw new Error('Invalid world object');
    const key = `${x},${y}`;
    if (occupied.has(key) || tileAt(x, y).terrain === 'road' || type !== 'tree' && tileAt(x, y).terrain !== 'grass') throw new Error(`Occupied tile: ${key}`);
    const object = { id: `${type}-${objects.length + 1}`, type, x, y, footprint: { width: 1, height: 1 }, variant: objects.length % 3 };
    objects.push(object);
    occupied.set(key, object);
  };
  [[3,4],[7,4],[9,4],[12,4],[16,4],[4,7],[4,9],[4,12],[4,16],[7,13],[9,13],[12,13],[16,13],[13,7],[13,9],[13,12],[13,16],[7,16],[10,16],[16,7],[16,10]].forEach(([x,y],i) => add(i % 3 === 0 ? 'townhouse' : 'cottage', x,y));
  [[2,2],[4,2],[7,2],[10,2],[13,2],[16,2],[18,3],[2,6],[2,9],[2,12],[2,16],[3,18],[6,18],[9,18],[12,18],[16,18],[18,16],[18,13],[18,10],[18,7],[7,7],[8,6],[11,6],[12,7],[7,9],[12,9],[8,12],[11,12],[8,17],[15,17],[17,15],[15,8]].forEach(([x,y]) => add('tree',x,y));
  return { size: MAP_SIZE, tiles, objects, occupied, tileAt, objectAt: (x, y) => occupied.get(`${x},${y}`) ?? null };
}
