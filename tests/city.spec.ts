import { test, expect } from "@playwright/test";
async function ready(page: import("@playwright/test").Page) {
  await page.goto("./");
  await expect(page.getByTestId("scene-host")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
}
test("renders textured GLBs under Pages base; camera, selection, preferences, save/load and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  const models = new Set<string>();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().endsWith(".glb") && r.ok()) models.add(r.url());
  });
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(models.size).toBe(9);
  await expect
    // Cold SwiftShader shader compilation on hosted CI can exceed 5 seconds.
    // Still require a real rendered frame; do not replace this with scene-ready.
    .poll(
      async () =>
        Number(
          (await page.getByTestId("render-stats").innerText()).match(
            /(\d+) draw calls/,
          )?.[1] ?? 0,
        ),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  const canvas = page.getByTestId("city-canvas");
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width * 0.53,
    cy = box.y + box.height * 0.55;
  await page.mouse.click(cx, cy);
  await expect(page.getByTestId("selection")).toContainText("Tọa độ");
  const before = await page
    .getByTestId("render-stats")
    .getAttribute("data-camera");
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -400);
  await expect
    .poll(() => page.getByTestId("render-stats").getAttribute("data-camera"), {
      timeout: 15000,
    })
    .not.toBe(before);
  const zoomed = await page
    .getByTestId("render-stats")
    .getAttribute("data-camera");
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 90, cy + 35, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => page.getByTestId("render-stats").getAttribute("data-camera"), {
      timeout: 15000,
    })
    .not.toBe(zoomed);
  const rotated = await page
    .getByTestId("render-stats")
    .getAttribute("data-camera");
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(cx + 50, cy, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await expect
    .poll(() => page.getByTestId("render-stats").getAttribute("data-camera"), {
      timeout: 15000,
    })
    .not.toBe(rotated);
  await page.getByRole("button", { name: "Đặt lại góc nhìn" }).click();
  await expect
    .poll(() => page.getByTestId("render-stats").getAttribute("data-camera"), {
      timeout: 15000,
    })
    .toBe(before);
  await page.getByRole("button", { name: "Lưới ô", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lưới ô", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Chất lượng", exact: true }).click();
  await page.getByRole("button", { name: "Thấp", exact: true }).click();
  await page
    .getByRole("button", { name: "Lưu thành phố", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.reload();
  await expect(page.getByTestId("scene-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Lưới ô", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Chất lượng", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Thấp", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Đặt lại thành phố", exact: true })
    .click();
  await page.getByRole("button", { name: "Giữ thành phố" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Đặt lại thành phố", exact: true })
    .click();
  await page.getByRole("button", { name: "Đặt lại dữ liệu" }).click();
  await expect(
    page.getByRole("button", { name: "Lưới ô", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByTestId("scene-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Lưới ô", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/city-desktop.png" });
});
test("corrupt IndexedDB data is reported and retained until explicit reset", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("focus-city", 1);
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction("saves", "readwrite");
        tx.objectStore("saves").put({ version: 42 }, "main");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Bản lưu gốc chưa bị ghi đè",
  );
  await expect(page.getByTestId("scene-host")).toHaveAttribute(
    "data-ready",
    "true",
  );
});
test("asset load failure gives an actionable error", async ({ page }) => {
  await page.route("**/assets/models/cottage.glb", (route) => route.abort());
  await page.goto("./");
  await expect(page.getByRole("alert")).toContainText(
    "Không tải được mô hình cottage",
  );
});
test("mobile layout keeps canvas and controls accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(
    page.getByRole("button", { name: "Lưu thành phố" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưới ô", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lưới ô", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/city-mobile.png" });
});

test("six identifiable services, a four-lane boulevard and a bounded streaming world", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  const scene = page.getByTestId("scene-host");
  await expect(scene).toHaveAttribute("data-chunk-count", "49");
  expect(
    Number(await scene.getAttribute("data-arterial-tiles")),
  ).toBeGreaterThan(64 * 4);
  expect(Number(await scene.getAttribute("data-crossings"))).toBeGreaterThan(
    10,
  );
  expect(Number(await scene.getAttribute("data-lamps"))).toBeGreaterThan(10);
  for (const [kind, label] of Object.entries({
    school: "Trường học Bình Minh",
    clinic: "Trạm y tế Trung tâm",
    fire: "Trạm cứu hỏa số 1",
    police: "Đồn cảnh sát Trung tâm",
    market: "Mini mart Góc Phố",
    park: "Công viên Thống Nhất",
  })) {
    await page.getByTestId(`service-${kind}`).click();
    await expect(page.getByTestId("selection")).toContainText(label);
    await expect(page.getByTestId(`map-service-${kind}`)).toBeVisible();
  }
  await page.getByRole("button", { name: "Đặt lại góc nhìn" }).click();
  await expect(scene).toHaveAttribute("data-chunk-center", "1,1");
  const initial = Number(await scene.getAttribute("data-chunk-revision"));
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Khám phá phía Đông" }).click();
  await expect(scene).toHaveAttribute("data-chunk-center", "4,1");
  await expect(scene).toHaveAttribute("data-chunk-count", "49");
  expect(
    Number(await scene.getAttribute("data-chunk-revision")),
  ).toBeGreaterThan(initial);
  await page.screenshot({ path: "test-results/city-streamed-east.png" });
  await page.getByRole("button", { name: "Đặt lại góc nhìn" }).click();
  await expect(scene).toHaveAttribute("data-chunk-center", "1,1");
  await page.getByRole("button", { name: "Đại lộ", exact: true }).click();
  await expect(page.getByTestId("selection")).toContainText(
    "Đại lộ Thống Nhất",
  );
  await page.screenshot({ path: "test-results/boulevard-upgraded.png" });
  expect(errors).toEqual([]);
});

test("opens and saves a migrated v1 game without losing the original snapshot", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.open("focus-city", 1);
      request.onsuccess = () => {
        const db = request.result,
          tx = db.transaction("saves", "readwrite");
        tx.objectStore("saves").put(
          {
            version: 1,
            size: 32,
            cellSize: 4,
            buildings: [
              { id: "old-house", kind: "cottage", x: 4, z: 4, rotation: 0 },
            ],
            grid: true,
            quality: "low",
            focusMinutes: 25,
          },
          "main",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  await page.reload();
  await expect(page.getByTestId("scene-host")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lưới ô", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Lưu thành phố", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  const saved = await page.evaluate(
    async () =>
      await new Promise<{
        version: number;
        legacySnapshot: { buildings: { id: string }[] };
      }>((resolve) => {
        const request = indexedDB.open("focus-city", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("saves");
          const result = tx.objectStore("saves").get("main");
          tx.oncomplete = () => {
            db.close();
            resolve(result.result);
          };
        };
      }),
  );
  expect(saved.version).toBe(2);
  expect(saved.legacySnapshot.buildings[0].id).toBe("old-house");
});
