import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repoRoot, 'frontend', '.vercel', 'output');
const target = path.join(repoRoot, '.vercel', 'output');

if (!existsSync(source)) {
  console.error(`[sync-vercel-output] Missing Nitro build output at ${source}`);
  console.error('[sync-vercel-output] Run with VERCEL=1 so the Nitro Vercel preset is enabled.');
  process.exit(1);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}

mkdirSync(path.dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });

console.log(`[sync-vercel-output] Copied ${source} → ${target}`);
