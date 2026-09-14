import { defineConfig } from "vitest/config";

// Unit tests run on Node, beside the sources they test. What must run on a device
// runs in the Maestro flows under `.maestro/`.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tools/**/*.test.ts", "test/**/*.test.ts"],
    passWithNoTests: true,
  },
});
