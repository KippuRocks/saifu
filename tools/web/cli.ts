// pnpm web:build runs this after `expo export`: writes dist/sw.js, Saifu Web's
// service worker, caching every file of the export (tools/web/service-worker.ts).

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  cacheName,
  precachePaths,
  SERVICE_WORKER_PATH,
  serviceWorkerSource,
} from "./service-worker.ts";

const dist = join(import.meta.dirname, "..", "..", "dist");

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [relative(dist, path)];
  });
}

const paths = precachePaths(files(dist));
const contents = new Map(paths.map((path) => [path, readFileSync(join(dist, path))]));
const cache = cacheName(contents);
writeFileSync(join(dist, SERVICE_WORKER_PATH), serviceWorkerSource(cache, paths));
console.log(`service worker: ${paths.length} files cached as ${cache}`);
