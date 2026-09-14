// Installs the runtime polyfills (polyfills.ts). Imported first by index.ts.

import { getRandomValues } from "expo-crypto";
import { installPolyfills } from "./polyfills.ts";

installPolyfills(globalThis, (bytes) => {
  getRandomValues(bytes);
});
