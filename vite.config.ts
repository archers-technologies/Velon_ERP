// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // Browser must not load CJS dist directly — use TypeScript source (ESM).
        "@velon/shared": path.resolve(rootDir, "packages/shared/src/index.ts"),
      },
    },
    optimizeDeps: {
      // Workspace package is aliased to TS source — pre-bundling caches stale exports.
      exclude: ["@velon/shared"],
    },
    build: {
      commonjsOptions: {
        include: [/packages\/shared/, /node_modules/],
        transformMixedEsModules: true,
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,
        },
      },
    },
  },
});
