import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * .mts so the file is loaded as ESM. A .ts config is loaded as CommonJS, which makes the
 * `import` syntax here a warning today and an error in a future Vite major.
 *
 * `import.meta.url` replaces `__dirname`, which does not exist in an ES module.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
