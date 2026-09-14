// pnpm lint:copy [paths...] — fails if any user-visible string uses fee
// vocabulary (REQ-SP-1a) or claims trust properties (REQ-TM-2).
// With no paths, checks the app's sources and its Expo configuration.

import { scan } from "./scan.ts";

const DEFAULT_PATHS = ["index.ts", "src", "modules", "app.json", "app.config.ts"];

const paths = process.argv.slice(2);
const violations = scan(process.cwd(), paths.length > 0 ? paths : DEFAULT_PATHS);

for (const { file, line, term, rule } of violations) {
  console.error(`${file}:${line}: "${term}" — ${rule.trace}: ${rule.reason}`);
}
if (violations.length > 0) {
  console.error(`\ncopy lint: ${violations.length} forbidden term(s)`);
  process.exit(1);
}
console.log("copy lint: no forbidden terms");
