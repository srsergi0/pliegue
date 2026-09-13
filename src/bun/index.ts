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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Diálogo abrir-PDF: un solo intento, bloqueo modal hasta que el usuario
 *  elige o cancela (los reintentos apilarían diálogos nativos). */
async function pickPdfRobust(): Promise<string | null> {
  console.log('[Pliegue] pickPdf: abriendo diálogo nativo...');
  const picked = await Utils.openFileDialog({
    startingFolder: Utils.paths.documents,
    allowedFileTypes: 'pdf',
    canChooseFiles: true,
    canChooseDirectory: false,
    allowsMultipleSelection: false,
  });
  console.log(`[Pliegue] pickPdf: diálogo devolvió ${picked.length} rutas`);
  const path = picked[0];
  if (!path) return null;
  if (!/\.pdf$/i.test(path)) {
    console.log('[Pliegue] pickPdf: no es PDF');
    return null;
  }
  return path;
}

const rpc = defineElectrobunRPC<PliegueRPCSchema>('bun', {
  // Los diálogos modales esperan al usuario: timeout generoso
  maxRequestTime: 300000,
  handlers: {
    requests: {
      ping: async () => {
        console.log('[Pliegue] ping recibido');
        return `Pliegue main OK (bun ${Bun.version})`;
      },

      pickPdf: async () => await pickPdfRobust(),

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
        // El SDK aún no expone diálogo "guardar como": se explica, se elige
        // carpeta y se escribe con el nombre sugerido.
        const confirm = await Utils.showMessageBox({
          type: 'info',
          title: 'Guardar PDF Imposicionado',
          message: `Elige la carpeta donde guardar:\n${sanitizeFileName(defaultName)}`,
          buttons: ['Elegir carpeta', 'Cancelar'],
          defaultId: 0,
          cancelId: 1,
        });
        if (confirm.response !== 0) return null;

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
        console.log(`[Pliegue] savePdf: escribiendo ${fullPath}`);
        try {
          await Bun.write(fullPath, Buffer.from(dataB64, 'base64'));
          console.log('[Pliegue] savePdf: OK');
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
