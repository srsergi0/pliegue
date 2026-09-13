import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Aliases del SDK Electrobun solo si el devkit de Hutch está preparado
// (`hutch electrobun prepare`). Sin devkit (CI de Electron) se omite.
// Replica electrobunViteAliases() del devkit sin importar su TS.
function electrobunAliases(): Array<{ find: RegExp; replacement: string }> {
  try {
    const pkgPath = path.resolve(__dirname, '.hutch/devkit/package.json');
    if (!fs.existsSync(pkgPath)) return [];
    const manifest = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      exports?: Record<string, unknown>;
    };
    const exportsMap = manifest.exports;
    if (!exportsMap || Array.isArray(exportsMap)) return [];
    const apiRoot = path.resolve(__dirname, '.hutch/devkit');
    const out: Array<{ find: RegExp; replacement: string }> = [];
    for (const [subpath, target] of Object.entries(exportsMap)) {
      if (typeof target !== 'string' || !target.startsWith('./api/')) continue;
      const specifier = subpath === '.' ? 'electrobun' : `electrobun${subpath.slice(1)}`;
      out.push({
        find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        replacement: path.resolve(apiRoot, target.slice(2)),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, '.') },
        ...electrobunAliases(),
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
