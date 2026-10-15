import { defineConfig, devices } from "@playwright/test";
const base = process.env.VITE_BASE_PATH || "/focus-city./";
export default defineConfig({
  timeout: 120000,
  workers: 1,
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:4173${base}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: `http://127.0.0.1:4173${base}`,
    env: { VITE_BASE_PATH: base },
    reuseExistingServer: false,
  },
});
