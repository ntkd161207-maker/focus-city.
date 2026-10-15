import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DATABASE,
  loadGame,
  migrateSave,
  resetGame,
  saveGame,
} from "./storage";
import { createState } from "../core/state";
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DATABASE);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
});
describe("versioned persistence", () => {
  it("loads defaults, saves preferences and buildings, resets", async () => {
    const s = await loadGame();
    expect(s.size).toBe(64);
    expect(new Set(s.buildings.map((b) => b.kind)).size).toBe(9);
    s.grid = true;
    s.quality = "low";
    s.buildings.pop();
    await saveGame(s);
    expect(await loadGame()).toEqual(s);
    expect(await resetGame()).toEqual(createState());
    expect(await loadGame()).toEqual(createState());
  });
  it.each([
    null,
    {},
    { ...createState(), version: 99 },
    { ...createState(), cellSize: 0 },
    { ...createState(), quality: "ultra" },
    {
      ...createState(),
      buildings: [{ id: "bad", kind: "__proto__", x: 1, z: 1, rotation: 0 }],
    },
    {
      ...createState(),
      buildings: [{ id: "bad", kind: "cottage", x: 7, z: 31, rotation: 0 }],
    },
    { ...createState(), focusMinutes: Infinity },
  ])("rejects corrupt or unsupported saves %#", (input) => {
    expect(() => migrateSave(input)).toThrow();
  });
  it("migrates v1 without losing preferences or original building records", async () => {
    const old = {
      version: 1,
      size: 32,
      cellSize: 4,
      grid: true,
      quality: "low",
      focusMinutes: 55,
      buildings: [
        { id: "my-home", kind: "cottage", x: 4, z: 4, rotation: 1.5 },
        { id: "my-office", kind: "tower", x: 20, z: 20, rotation: 0 },
      ],
    };
    const next = migrateSave(old);
    expect(next.version).toBe(2);
    expect(next.size).toBe(64);
    expect(next.grid).toBe(true);
    expect(next.quality).toBe("low");
    expect(next.focusMinutes).toBe(55);
    expect(next.legacySnapshot).toEqual(old);
    expect(next.buildings.find((b) => b.id === "legacy-my-home")).toMatchObject(
      { kind: "cottage", rotation: 1.5 },
    );
    expect(
      next.buildings.find((b) => b.id === "legacy-my-office"),
    ).toMatchObject({ kind: "tower" });
    await saveGame(next);
    expect(await loadGame()).toEqual(next);
    expect(migrateSave(next)).toEqual(next);
  });
  it("rejects overlapping buildings", () => {
    const s = createState();
    s.buildings.push({ ...s.buildings[0], id: "duplicate-cell" });
    expect(() => migrateSave(s)).toThrow();
  });
  it("preserves unsupported data rather than silently overwriting", async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open(DATABASE, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("saves");
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("saves", "readwrite");
      tx.objectStore("saves").put({ version: 9 }, "main");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    });
    await expect(loadGame()).rejects.toThrow("Phiên bản");
    await expect(loadGame()).rejects.toThrow("Phiên bản");
  });
});
