// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@lovable.dev/vite-tanstack-config';
import { nitro } from 'nitro/vite';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(frontendDir, '..');
const isVercelBuild = Boolean(process.env.VERCEL);
const isRailwayCombined = process.env.RAILWAY_STACK === 'combined';
const internalApiOrigin = process.env.INTERNAL_API_ORIGIN ?? 'http://127.0.0.1:3001';

export default defineConfig({
  // Cloudflare worker output breaks Vercel static hosting (no index.html). Use Nitro on Vercel.
  cloudflare: isVercelBuild ? false : undefined,
  vite: {
    envDir: monorepoRoot,
    plugins: isVercelBuild
      ? [
          nitro(
            isRailwayCombined
              ? {
                  routeRules: {
                    '/api/**': { proxy: `${internalApiOrigin}/api/**` },
                  },
                }
              : {},
          ),
        ]
      : [],
    resolve: {
      alias: {
        // Browser must not load CJS dist directly — use TypeScript source (ESM).
        '@velon/shared': path.resolve(monorepoRoot, 'packages/shared-kernel/src/index.ts'),
      },
    },
    optimizeDeps: {
      // Workspace package is aliased to TS source — pre-bundling caches stale exports.
      exclude: ['@velon/shared'],
    },
    build: {
      commonjsOptions: {
        include: [/packages\/shared-kernel/, /node_modules/],
        transformMixedEsModules: true,
      },
    },
    server: {
      proxy: {
        '/api': {
          target: internalApiOrigin,
          changeOrigin: true,
        },
      },
    },
  },
});
