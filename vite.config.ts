import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Aliases del SDK Electrobun. Con devkit de Hutch (`hutch electrobun prepare`)
// se resuelve el SDK real; sin devkit (CI de Electron) se usa un stub que
// en runtime jamás se toca (todo va tras `isElectrobun`).
function electrobunAliases(): Array<{ find: RegExp; replacement: string }> {
  const devkitPkg = path.resolve(__dirname, '.hutch/devkit/package.json');
  if (fs.existsSync(devkitPkg)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(devkitPkg, 'utf8')) as {
        exports?: Record<string, unknown>;
      };
      const exportsMap = manifest.exports;
      if (exportsMap && !Array.isArray(exportsMap)) {
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
        if (out.length > 0) return out;
      }
    } catch {
      // caer al stub
    }
  }
  return [
    {
      find: /^electrobun\/view$/,
      replacement: path.resolve(__dirname, 'src/electrobun-view-stub.ts'),
    },
  ];
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
