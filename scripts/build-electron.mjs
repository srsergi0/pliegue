import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

const isDev = process.env.NODE_ENV === 'development';

// Ensure dist-electron directory exists
if (!fs.existsSync('dist-electron')) {
  fs.mkdirSync('dist-electron', { recursive: true });
}

try {
  // Build main process
  await esbuild.build({
    entryPoints: ['electron/main.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist-electron/main.cjs',
    format: 'cjs',
    external: ['electron'],
    sourcemap: isDev,
    minify: !isDev,
  });

  // Build preload script
  await esbuild.build({
    entryPoints: ['electron/preload.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist-electron/preload.cjs',
    format: 'cjs',
    external: ['electron'],
    sourcemap: isDev,
    minify: !isDev,
  });

  console.log('✓ Electron main y preload compilados con éxito.');
} catch (err) {
  console.error('Error al compilar Electron:', err);
  process.exit(1);
}
