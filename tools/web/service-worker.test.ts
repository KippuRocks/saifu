import { describe, expect, it } from "vitest";
import { cacheName, precachePaths, serviceWorkerSource } from "./service-worker.ts";

describe("T-030-19 Saifu Web service worker", () => {
  it("caches every file of the export but itself and source maps", () => {
    expect(
      precachePaths([
        "index.html",
        "_expo/static/js/web/index-1.js",
        "sw.js",
        "x.js.map",
        "favicon.ico",
      ]),
    ).toEqual(["/_expo/static/js/web/index-1.js", "/favicon.ico", "/index.html"]);
  });

  it("names the cache for the export's contents", () => {
    const one = new Map([["/index.html", new TextEncoder().encode("a")]]);
    const two = new Map([["/index.html", new TextEncoder().encode("b")]]);
    expect(cacheName(one)).toMatch(/^saifu-[0-9a-f]{16}$/);
    expect(cacheName(one)).toBe(cacheName(new Map(one)));
    expect(cacheName(one)).not.toBe(cacheName(two));
  });

  it("NFR-3: falls back to the cached app for a page load, and leaves other origins alone", () => {
    const source = serviceWorkerSource("saifu-0", ["/index.html"]);
    expect(source).toContain('const CACHE = "saifu-0";');
    expect(source).toContain('const PRECACHE = ["/index.html"];');
    expect(source).toContain('request.mode === "navigate"');
    expect(source).toContain("url.origin !== self.location.origin");
    expect(() => new Function(source)).not.toThrow();
  });
});
