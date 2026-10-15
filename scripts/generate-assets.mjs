// Original CC0 placeholder architecture. Deterministic GLB 2.0, embedded PNG texture.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
mkdirSync("public/assets/models", { recursive: true });
function crc32(buf) {
  let c = -1;
  for (const v of buf) {
    c ^= v;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ -1) >>> 0;
}
function chunk(type, bytes) {
  const t = Buffer.from(type),
    n = Buffer.alloc(4),
    c = Buffer.alloc(4);
  n.writeUInt32BE(bytes.length);
  c.writeUInt32BE(crc32(Buffer.concat([t, bytes])));
  return Buffer.concat([n, t, bytes, c]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(8, 0);
ihdr.writeUInt32BE(8, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const pixels = Buffer.alloc(8 * 25);
for (let y = 0; y < 8; y++) {
  pixels[y * 25] = 0;
  for (let x = 0; x < 8; x++)
    for (let c = 0; c < 3; c++)
      pixels[y * 25 + 1 + x * 3 + c] = (x + y) % 3 === 0 ? 225 : 250;
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(pixels)),
  chunk("IEND", Buffer.alloc(0)),
]);
function generate(kind) {
  const positions = [],
    normals = [],
    uvs = [];
  const faces = [
    [
      [1, 0, 0],
      [0.5, -0.5, 0.5],
      [0.5, -0.5, -0.5],
      [0.5, 0.5, -0.5],
      [0.5, 0.5, 0.5],
    ],
    [
      [-1, 0, 0],
      [-0.5, -0.5, -0.5],
      [-0.5, -0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [-0.5, 0.5, -0.5],
    ],
    [
      [0, 1, 0],
      [-0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
      [0.5, 0.5, -0.5],
      [-0.5, 0.5, -0.5],
    ],
    [
      [0, -1, 0],
      [-0.5, -0.5, -0.5],
      [0.5, -0.5, -0.5],
      [0.5, -0.5, 0.5],
      [-0.5, -0.5, 0.5],
    ],
    [
      [0, 0, 1],
      [-0.5, -0.5, 0.5],
      [0.5, -0.5, 0.5],
      [0.5, 0.5, 0.5],
      [-0.5, 0.5, 0.5],
    ],
    [
      [0, 0, -1],
      [0.5, -0.5, -0.5],
      [-0.5, -0.5, -0.5],
      [-0.5, 0.5, -0.5],
      [0.5, 0.5, -0.5],
    ],
  ];
  for (const [normal, ...verts] of faces)
    for (const i of [0, 1, 2, 0, 2, 3]) {
      positions.push(...verts[i]);
      normals.push(...normal);
      uvs.push(
        ...[
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ][i],
      );
    }
  const parts = [],
    views = [],
    accessors = [];
  let length = 0;
  function bufferView(bytes) {
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
    bytes.copy(padded);
    const index = views.length;
    views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length });
    parts.push(padded);
    length += padded.length;
    return index;
  }
  function accessor(values, type, min, max) {
    const arr = new Float32Array(values);
    const bufferViewIndex = bufferView(Buffer.from(arr.buffer));
    accessors.push({
      bufferView: bufferViewIndex,
      componentType: 5126,
      count: values.length / (type === "VEC3" ? 3 : 2),
      type,
      ...(min ? { min, max } : {}),
    });
    return accessors.length - 1;
  }
  const p = accessor(positions, "VEC3", [-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]),
    n = accessor(normals, "VEC3"),
    u = accessor(uvs, "VEC2");
  const imageView = bufferView(png);
  const palette = {
    stone: [0.79, 0.76, 0.65],
    accent: {
      school: [0.85, 0.59, 0.25],
      clinic: [0.12, 0.56, 0.41],
      fire: [0.72, 0.17, 0.1],
      police: [0.13, 0.32, 0.51],
      market: [0.26, 0.49, 0.18],
      park: [0.29, 0.48, 0.26],
    }[kind] || [0.5, 0.5, 0.5],
    wall:
      kind === "cottage"
        ? [0.91, 0.82, 0.64]
        : kind === "townhouse"
          ? [0.61, 0.29, 0.19]
          : [0.59, 0.64, 0.62],
    roof: [0.24, 0.32, 0.33],
    glass: [0.16, 0.33, 0.38],
    trim: [0.92, 0.91, 0.83],
    wood: [0.33, 0.23, 0.15],
    metal: [0.19, 0.23, 0.24],
  };
  const keys = Object.keys(palette);
  const materials = keys.map((key) => ({
    name: key,
    pbrMetallicRoughness: {
      baseColorFactor: [...palette[key], 1],
      baseColorTexture: { index: 0 },
      metallicFactor: key === "glass" ? 0.35 : 0.03,
      roughnessFactor: key === "glass" ? 0.25 : 0.85,
    },
  }));
  const meshes = keys.map((key, i) => ({
    name: key,
    primitives: [
      { attributes: { POSITION: p, NORMAL: n, TEXCOORD_0: u }, material: i },
    ],
  }));
  const nodes = [];
  function box(name, mat, x, y, z, sx, sy, sz, rotation) {
    nodes.push({
      name,
      mesh: keys.indexOf(mat),
      translation: [x, y, z],
      scale: [sx, sy, sz],
      ...(rotation ? { rotation } : {}),
    });
  }
  box("Foundation", "stone", 0, 0.12, 0, 3.5, 0.24, 3.5);
  if (["school", "clinic", "fire", "police", "market", "park"].includes(kind)) {
    const width = kind === "school" ? 22 : 17,
      depth = 17;
    box("Service forecourt", "stone", 0, 0.1, 0, width, 0.2, depth);
    if (kind === "park") {
      box("Lawn", "accent", 0, 0.23, 0, 16, 0.18, 16);
      box("Promenade", "stone", 0, 0.35, 0, 2, 0.1, 16);
      box("Cross promenade", "stone", 0, 0.36, 0, 16, 0.1, 2);
      box("Fountain basin", "roof", 0, 0.6, 0, 5, 0.5, 5);
      box("Fountain water", "glass", 0, 0.88, 0, 4.4, 0.1, 4.4);
      box("Sculpture plinth", "trim", 0, 1.2, 0, 1.2, 0.7, 1.2);
      box("Sculpture", "accent", 0, 2.25, 0, 0.5, 1.5, 0.5);
      for (const x of [-5, 5])
        for (const z of [-5, 5]) {
          box("Raised planter", "stone", x, 0.5, z, 3, 0.5, 3);
          box("Garden hedge", "accent", x, 1, z, 2.5, 0.6, 2.5);
          box("Bench seat", "wood", x, 0.6, z + 2, 2.5, 0.25, 0.7);
          box("Bench back", "wood", x, 1, z + 2.3, 2.5, 0.7, 0.12);
          for (const dx of [-0.8, 0.8])
            box("Bench legs", "metal", x + dx, 0.35, z + 2, 0.1, 0.5, 0.4);
        }
    } else {
      const h =
        kind === "school"
          ? 7
          : kind === "clinic"
            ? 8
            : kind === "market"
              ? 4
              : 6;
      const w = kind === "school" ? 19 : 14,
        d = 10;
      box("Public building", "trim", 0, h / 2 + 0.3, -1, w, h, d);
      box("Flat roof coping", "roof", 0, h + 0.5, -1, w + 0.4, 0.3, d + 0.4);
      box("Facade color band", "accent", 0, h - 0.6, 4.06, w, 0.8, 0.2);
      box("Entry plaza", "stone", 0, 0.3, 6, w, 0.3, 4);
      box("Entry canopy", "accent", 0, 3, 5, 5, 0.25, 2.5);
      box("Glazed entry", "glass", 0, 1.6, 4.1, 2.8, 2.7, 0.15);
      for (let f = 0; f < (kind === "market" ? 1 : 2); f++)
        for (let x = -w / 2 + 1.4; x < w / 2 - 1; x += 2.4) {
          if (Math.abs(x) < 2 && f === 0) continue;
          box("Window frame", "roof", x, 1.8 + f * 3, 4.08, 1.8, 1.7, 0.16);
          box("Window glass", "glass", x, 1.8 + f * 3, 4.18, 1.55, 1.45, 0.1);
          box("Rear window", "glass", x, 1.8 + f * 3, -6.04, 1.6, 1.5, 0.12);
        }
      for (const x of [-w / 2 - 0.05, w / 2 + 0.05])
        for (const z of [-3, 0, 2])
          box("Side window", "glass", x, 2, z, 0.1, 1.6, 1.6);
      box("Air conditioning", "metal", w / 3, h + 0.9, -2, 2, 0.6, 2);
      if (kind === "school") {
        box("School entrance tower", "accent", -6, 4.8, 2, 3, 8.8, 4);
        box("Clock face", "trim", -6, 7.1, 4.15, 1.8, 1.8, 0.12);
        box("Clock minute hand", "metal", -6, 7.4, 4.24, 0.08, 0.65, 0.05);
        box("Clock hour hand", "metal", -5.8, 7.1, 4.24, 0.5, 0.08, 0.05);
        box("School yard", "accent", 6, 0.36, 6, 7, 0.08, 3);
      }
      if (kind === "clinic") {
        box("Medical sign board", "trim", 0, h + 1.5, 3.5, 3, 3, 0.4);
        box(
          "Medical vertical cross",
          "accent",
          0,
          h + 1.5,
          3.75,
          0.65,
          2.3,
          0.1,
        );
        box(
          "Medical horizontal cross",
          "accent",
          0,
          h + 1.5,
          3.76,
          2.3,
          0.65,
          0.1,
        );
        box("Accessible entry ramp", "stone", 4, 0.45, 5, 2, 0.6, 4);
      }
      if (kind === "fire") {
        for (const x of [-4.5, 0, 4.5]) {
          box("Fire garage door", "accent", x, 1.8, 4.25, 3.6, 3, 0.15);
          for (let i = 0; i < 5; i++)
            box(
              "Garage panel",
              "trim",
              x,
              0.7 + i * 0.5,
              4.35,
              3.4,
              0.06,
              0.04,
            );
        }
        box("Hose drying tower", "accent", -5, 5.5, -3, 2.5, 10, 3);
      }
      if (kind === "police") {
        box("Blue reception wing", "accent", 5, 2, 2, 3, 3.5, 5);
        box("Radio mast", "metal", -3, h + 3, -2, 0.12, 5, 0.12);
        box("Radio antenna", "metal", -3, h + 4.6, -2, 2, 0.1, 0.1);
        box("Police sign", "accent", 0, 4.6, 4.3, 5, 1.3, 0.15);
        box("Station badge", "trim", 0, 4.6, 4.4, 0.8, 0.8, 0.1);
      }
      if (kind === "market") {
        for (let x = -6; x < 7; x++)
          box(
            "Striped shop awning",
            x % 2 === 0 ? "accent" : "trim",
            x,
            3.4,
            5.2,
            1,
            0.25,
            2.4,
          );
        box("Shop fascia", "accent", 0, 4.5, 4.1, 13, 1, 0.2);
        for (const x of [-4, 4])
          box("Display glazing", "glass", x, 1.6, 4.3, 4, 2.3, 0.12);
        for (const x of [-6, 6])
          box("Store planter", "accent", x, 0.7, 6.6, 1.4, 1, 1.4);
      }
    }
  } else if (kind === "cottage") {
    box("Plaster walls", "wall", 0, 1.25, 0, 2.8, 2.3, 2.65);
    for (const side of [-1, 1]) {
      const a = side * 0.56;
      box("Pitched metal roof", "roof", side * 0.75, 2.85, 0, 1.85, 0.13, 3.2, [
        0,
        0,
        Math.sin(-a / 2),
        Math.cos(a / 2),
      ]);
    }
    box("Chimney", "wall", 0.85, 3.15, -0.6, 0.4, 1, 0.45);
    box("Porch", "trim", 0, 0.3, 1.55, 1.5, 0.22, 0.65);
    box("Door", "wood", 0, 0.95, 1.34, 0.52, 1.5, 0.06);
    for (const x of [-0.88, 0.88]) {
      box("Window frame", "trim", x, 1.45, 1.36, 0.67, 0.95, 0.07);
      box("Window", "glass", x, 1.45, 1.41, 0.51, 0.78, 0.03);
      box("Mullion", "trim", x, 1.45, 1.44, 0.035, 0.8, 0.03);
    }
    for (const x of [-1.42, 1.42])
      for (const z of [-0.65, 0.65])
        box("Side window", "glass", x, 1.4, z, 0.035, 0.8, 0.65);
  } else {
    const floors = kind === "tower" ? 9 : 4,
      h = floors * 1.25;
    box("Main structure", "wall", 0, h / 2 + 0.25, 0, 2.9, h, 2.9);
    for (let f = 0; f < floors; f++) {
      const y = 0.9 + f * 1.25;
      for (const a of [-0.9, 0, 0.9])
        for (const side of [-1, 1]) {
          box("Facade glazing", "glass", a, y, side * 1.46, 0.65, 0.83, 0.04);
          box("Side glazing", "glass", side * 1.46, y, a, 0.04, 0.83, 0.65);
        }
      box("Cornice", "trim", 0, y + 0.55, 0, 3.05, 0.12, 3.05);
    }
    box("Roof cap", "roof", 0, h + 0.4, 0, 3.2, 0.2, 3.2);
    box("Roof service room", "metal", 0.55, h + 0.75, -0.3, 0.8, 0.6, 0.9);
    box("Entry canopy", "trim", 0, 0.85, 1.65, 1.1, 0.12, 0.6);
    box("Entry door", "glass", 0, 0.65, 1.49, 0.65, 1, 0.04);
    if (kind === "tower") {
      box("Crown", "wall", 0, h + 1, 0, 1.6, 1.2, 1.6);
      box("Crown roof", "roof", 0, h + 1.65, 0, 1.8, 0.15, 1.8);
    }
  }
  const bin = Buffer.concat(parts);
  const gltf = {
    asset: {
      version: "2.0",
      generator: "Focus City original placeholder generator",
      copyright: "CC0-1.0",
    },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials,
    buffers: [{ byteLength: bin.length }],
    bufferViews: views,
    accessors,
    images: [{ bufferView: imageView, mimeType: "image/png" }],
    samplers: [
      { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 },
    ],
    textures: [{ source: 0, sampler: 0 }],
  };
  const raw = Buffer.from(JSON.stringify(gltf));
  const json = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32);
  raw.copy(json);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(json.length);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  writeFileSync(
    `public/assets/models/${kind}.glb`,
    Buffer.concat([header, jh, json, bh, bin]),
  );
}
for (const kind of [
  "cottage",
  "townhouse",
  "tower",
  "school",
  "clinic",
  "fire",
  "police",
  "market",
  "park",
])
  generate(kind);
console.log("Generated nine original, textured GLB placeholders.");
