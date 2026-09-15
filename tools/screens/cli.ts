// pnpm screens:write — generates screens.json from the router and the navigation in src/.
// pnpm screens:check — fails if screens.json is out of date, or any navigation is undeclared.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extract } from "./extract.ts";
import { buildManifest, serialise } from "./manifest.ts";

const root = join(import.meta.dirname, "..", "..");
const path = join(root, "screens.json");
const mode = process.argv[2];

if (mode !== "write" && mode !== "check") {
  console.error("usage: node tools/screens/cli.ts write|check");
  process.exit(2);
}

const { manifest, problems } = buildManifest(extract(root));
for (const { file, line, message } of problems) {
  console.error(`${file}:${line}: ${message}`);
}
if (problems.length > 0) {
  console.error(`\nscreens: ${problems.length} problem(s)`);
  process.exit(1);
}

const generated = serialise(manifest);
if (mode === "write") {
  writeFileSync(path, generated);
  console.log(`screens: wrote ${manifest.screens.length} screens to screens.json`);
} else {
  let committed = "";
  try {
    committed = readFileSync(path, "utf8");
  } catch {
    // Missing: reported as out of date below.
  }
  if (committed !== generated) {
    console.error("screens: screens.json is out of date; run `pnpm screens:write` and commit it");
    process.exit(1);
  }
  console.log(`screens: screens.json is up to date (${manifest.screens.length} screens)`);
}
