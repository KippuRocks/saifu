import { defineConfig, devices } from "@playwright/test";
import { writeCameraVideo } from "./test/web/camera.ts";

const CI = process.env.CI !== undefined;

/**
 * Saifu Web's smoke test (T-030-18): the exported web build (`pnpm web:build`)
 * in Chromium, at its own origin, against local stand-ins for the services it
 * calls (test/web/stack.ts). No server is started: every request is answered
 * by request interception.
 */
export default defineConfig({
  testDir: "test/web",
  testMatch: "*.spec.ts",
  // One worker: the tests are short, and the machines running them are shared.
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "retain-on-failure",
    permissions: ["camera"],
    // A fake camera showing a receive code (test/web/camera.ts).
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        `--use-file-for-fake-video-capture=${writeCameraVideo()}`,
      ],
    },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
