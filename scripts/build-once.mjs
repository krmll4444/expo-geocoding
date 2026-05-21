/**
 * One-shot compile: expo-module's `expo-module-build` adds `tsc --watch` when stdout is a TTY
 * and EXPO_NONINTERACTIVE is unset, which hangs `npm run build` / `npm publish`.
 * @see node_modules/expo-module-scripts/utils/commandUtils.js — shouldAddWatchFlag()
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const expoModuleScriptsDir = path.dirname(require.resolve('expo-module-scripts/package.json'));
const buildBin = path.join(expoModuleScriptsDir, 'bin', 'expo-module-build');

const result = spawnSync(process.execPath, [buildBin], {
  cwd: pkgRoot,
  stdio: 'inherit',
  env: { ...process.env, EXPO_NONINTERACTIVE: '1' },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 0);
