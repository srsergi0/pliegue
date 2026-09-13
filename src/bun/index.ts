/**
 * Proceso principal de Pliegue bajo Electrobun (runtime Cottontail/Bun).
 * Equivalente a electron/main.ts: ventana, diálogos nativos y shell,
 * expuestos a la vista React vía RPC.
 */
import { BrowserWindow, Updater, Utils, defineElectrobunRPC } from 'electrobun/main';
import type { PliegueRPCSchema } from '../shared/pliegue-rpc';

const DEV_SERVER_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;

function basename(p: string): string {
  return p.split(/[/\\]/).pop() || p;
}

function sanitizeFileName(name: string): string {
  return basename(name).replace(/[[/\\]]/g, '_') || 'pliegue.pdf';
}

const rpc = defineElectrobunRPC<PliegueRPCSchema>('bun', {
  handlers: {
    requests: {
      ping: async () => {
        console.log('[Pliegue] ping recibido');
        return `Pliegue main OK (bun ${Bun.version})`;
      },

      pickPdf: async () => {
        console.log('[Pliegue] pickPdf: abriendo diálogo...');
        const picked = await Utils.openFileDialog({
          startingFolder: Utils.paths.documents,
          allowedFileTypes: 'pdf',
          canChooseFiles: true,
          canChooseDirectory: false,
          allowsMultipleSelection: false,
        });
        console.log(`[Pliegue] pickPdf: diálogo devolvió ${picked.length} rutas`);
        const path = picked[0];
        if (!path || !/\.pdf$/i.test(path)) return null;
        return path;
      },

      readPdf: async ({ path }: { path: string }) => {
        try {
          console.log(`[Pliegue] readPdf: ${path}`);
          const file = Bun.file(path);
          if (!(await file.exists())) return null;
          const buf = Buffer.from(await file.arrayBuffer());
          return {
            name: basename(path),
            size: buf.length,
            dataB64: buf.toString('base64'),
          };
        } catch (err) {
          console.error('[Pliegue] error leyendo PDF:', err);
          return null;
        }
      },

      savePdf: async ({
        defaultName,
        dataB64,
      }: {
        defaultName: string;
        dataB64: string;
      }) => {
        // El SDK aún no expone diálogo "guardar como": se elige carpeta
        // y se escribe con el nombre sugerido.
        const picked = await Utils.openFileDialog({
          startingFolder: Utils.paths.documents,
          allowedFileTypes: '*',
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });
        const dir = picked[0];
        if (!dir) return null;
        const fullPath = `${dir.replace(/[/\\]$/, '')}/${sanitizeFileName(defaultName)}`;
        try {
          await Bun.write(fullPath, Buffer.from(dataB64, 'base64'));
          return fullPath;
        } catch (err) {
          console.error('[Pliegue] error guardando PDF:', err);
          throw new Error('No se pudo escribir el archivo PDF.');
        }
      },

      openPath: async ({ path }: { path: string }) => {
        return Utils.openPath(path);
      },

      showInFolder: async ({ path }: { path: string }) => {
        Utils.showItemInFolder(path);
      },

      toggleDevTools: async () => {
        mainWindow?.webview.toggleDevTools();
      },

      windowControl: async ({
        action,
      }: {
        action: 'minimize' | 'maximize' | 'close';
      }) => {
        if (!mainWindow) return;
        if (action === 'minimize') mainWindow.minimize();
        else if (action === 'close') mainWindow.close();
        else {
          if (mainWindow.isMaximized()) mainWindow.unmaximize();
          else mainWindow.maximize();
        }
      },
    },
  },
});

async function getMainViewUrl(): Promise<string> {
  try {
    const res = await fetch(DEV_SERVER_URL, { method: 'HEAD' });
    if (res.ok) {
      console.log(`[Pliegue] HMR activo: ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    }
  } catch {
    // Sin dev server: vista empaquetada
  }
  return 'views://mainview/index.html';
}

const url = await getMainViewUrl();

mainWindow = new BrowserWindow({
  title: 'Pliegue — Preprensa Digital',
  url,
  frame: {
    width: 1203,
    height: 736,
  },
  rpc,
});

// En Hyprland/tiling, abrir maximizada queda bien acomodada
mainWindow.maximize();

// DevTools automáticas en canal dev (paridad con Electron)
try {
  const channel = await Updater.localInfo.channel();
  if (channel === 'dev') {
    mainWindow.webview.openDevTools();
  }
} catch {
  // Sin updater configurado: continuar sin DevTools
}

console.log('[Pliegue] proceso main Electrobun iniciado');
