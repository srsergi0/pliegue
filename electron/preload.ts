import { contextBridge, ipcRenderer } from 'electron';

export interface OpenPDFResult {
  canceled: boolean;
  name?: string;
  path?: string;
  data?: Uint8Array;
}

export interface SavePDFResult {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

const electronAPI = {
  isElectron: true,
  
  // Diálogo nativo para seleccionar y abrir PDF
  openPDFDialog: async (): Promise<OpenPDFResult> => {
    return await ipcRenderer.invoke('dialog:open-pdf');
  },

  // Diálogo nativo para guardar PDF imposicionado
  savePDF: async (defaultName: string, bytes: Uint8Array): Promise<SavePDFResult> => {
    return await ipcRenderer.invoke('dialog:save-pdf', { defaultName, bytes });
  },

  // Abrir archivo en la aplicación por defecto del sistema operativo
  openPath: async (filePath: string): Promise<string> => {
    return await ipcRenderer.invoke('shell:open-path', filePath);
  },

  // Mostrar archivo resaltado en el explorador de archivos (Windows Explorer)
  showInFolder: async (filePath: string): Promise<void> => {
    return await ipcRenderer.invoke('shell:show-item-in-folder', filePath);
  },

  // Controles de ventana
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
