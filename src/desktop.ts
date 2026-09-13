/**
 * Capa unificada de escritorio: Electron / Electrobun / Web.
 *
 * - En Electron delega en `window.electronAPI` (preload).
 * - En Electrobun usa el RPC `PliegueRPCSchema` contra el proceso main
 *   (Bun/Cottontail). Los binarios viajan en base64.
 * - En web usa los fallbacks del navegador (inputs, descargas).
 *
 * Los imports de `electrobun/view` son dinámicos para no meter ese código
 * en el bundle de Electron/web.
 */
import type { OpenPDFResult, SavePDFResult } from './vite-env.d';
import type { PliegueRPCSchema } from './shared/pliegue-rpc';

type BunRequests = PliegueRPCSchema['bun']['requests'];

export const isElectrobun =
  typeof window !== 'undefined' && '__electrobunWebviewId' in window;

export const isElectron =
  typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export const isDesktop = isElectrobun || isElectron;

// --- Cliente RPC Electrobun (una sola instancia) ---

type RpcClient = {
  request<K extends keyof BunRequests>(
    method: K,
    ...args: 'params' extends keyof BunRequests[K]
      ? [params: BunRequests[K]['params']]
      : []
  ): Promise<BunRequests[K] extends { response: infer R } ? R : unknown>;
};

let electroviewPromise: Promise<RpcClient> | null = null;

async function getRpc(): Promise<RpcClient> {
  if (!electroviewPromise) {
    electroviewPromise = (async () => {
      const { Electroview, defineElectrobunRPC } = await import(
        'electrobun/view'
      );
      const rpc = defineElectrobunRPC('webview', { handlers: {} });
      const view = new Electroview({ rpc });
      return rpc as unknown as RpcClient;
    })();
  }
  return electroviewPromise;
}

// --- Binarios base64 <-> Uint8Array ---

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} (tiempo agotado)`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Ping al proceso main. false si el RPC no responde (usar modo web). */
export async function pingNative(timeoutMs = 5000): Promise<boolean> {
  if (!isElectrobun) return false;
  try {
    const rpc = await withTimeout(getRpc(), timeoutMs, 'RPC no disponible');
    const res = await withTimeout(
      rpc.request('ping', {}),
      timeoutMs,
      'Sin respuesta del main'
    );
    return typeof res === 'string' && res.length > 0;
  } catch {
    return false;
  }
}

/** Diálogo nativo para abrir un PDF. Lanza error si falla (para fallback). */
export async function desktopOpenPDF(): Promise<OpenPDFResult> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.openPDFDialog();
  }
  const rpc = await withTimeout(getRpc(), 8000, 'RPC no disponible');
  const path = await withTimeout(
    rpc.request('pickPdf', {}),
    60000,
    'Diálogo sin respuesta'
  );
  if (!path) return { canceled: true };
  const file = await withTimeout(
    rpc.request('readPdf', { path }),
    120000,
    'Lectura sin respuesta'
  );
  if (!file) return { canceled: true };
  const data = b64ToU8(file.dataB64);
  return { canceled: false, name: file.name, path, data };
}

/** Diálogo nativo para guardar el PDF imposicionado. */
export async function desktopSavePDF(
  defaultName: string,
  bytes: Uint8Array
): Promise<SavePDFResult> {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.savePDF(defaultName, bytes);
  }
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const rpc = await getRpc();
  const filePath = await rpc.request('savePdf', {
    defaultName,
    dataB64: btoa(binary),
  });
  if (!filePath) return { canceled: true };
  return { canceled: false, filePath };
}

/** Abrir archivo con la app por defecto del sistema. */
export async function desktopOpenPath(filePath: string): Promise<void> {
  if (isElectron && window.electronAPI) {
    await window.electronAPI.openPath(filePath);
    return;
  }
  const rpc = await getRpc();
  await rpc.request('openPath', { path: filePath });
}

/** Mostrar archivo resaltado en el explorador. */
export async function desktopShowInFolder(filePath: string): Promise<void> {
  if (isElectron && window.electronAPI) {
    await window.electronAPI.showInFolder(filePath);
    return;
  }
  const rpc = await getRpc();
  await rpc.request('showInFolder', { path: filePath });
}

/** Alternar DevTools (F12 en Electrobun). */
export async function desktopToggleDevTools(): Promise<void> {
  if (isElectrobun) {
    const rpc = await getRpc();
    await rpc.request('toggleDevTools', {});
  }
}

// Controles de ventana (paridad con Electron; hoy la UI usa marco nativo).
export async function desktopMinimize(): Promise<void> {
  if (isElectron && window.electronAPI) {
    await window.electronAPI.minimizeWindow();
    return;
  }
  const rpc = await getRpc();
  await rpc.request('windowControl', { action: 'minimize' });
}

export async function desktopToggleMaximize(): Promise<void> {
  if (isElectron && window.electronAPI) {
    await window.electronAPI.maximizeWindow();
    return;
  }
  const rpc = await getRpc();
  await rpc.request('windowControl', { action: 'maximize' });
}

export async function desktopClose(): Promise<void> {
  if (isElectron && window.electronAPI) {
    await window.electronAPI.closeWindow();
    return;
  }
  const rpc = await getRpc();
  await rpc.request('windowControl', { action: 'close' });
}

// --- Zoom (CSS + localStorage; en Electron es nativo) ---

const ZOOM_KEY = 'pliegue-zoom';

export function getZoom(): number {
  const v = parseFloat(localStorage.getItem(ZOOM_KEY) || '1');
  return Number.isFinite(v) ? Math.min(3, Math.max(0.5, v)) : 1;
}

export function applyZoom(z: number): void {
  const clamped = Math.min(3, Math.max(0.5, z));
  document.documentElement.style.zoom = String(clamped);
  localStorage.setItem(ZOOM_KEY, String(clamped));
}

/** Aplica el zoom guardado al arrancar (Electrobun; Electron usa zoom nativo). */
export function initZoom(): void {
  if (isElectrobun && !isElectron) {
    applyZoom(getZoom());
  }
}
