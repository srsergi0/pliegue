/// <reference types="vite/client" />

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

export interface ElectronAPI {
  isElectron: boolean;
  openPDFDialog: () => Promise<OpenPDFResult>;
  savePDF: (defaultName: string, bytes: Uint8Array) => Promise<SavePDFResult>;
  openPath: (filePath: string) => Promise<string>;
  showInFolder: (filePath: string) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  getSystemLocale?: () => Promise<string>;
  getPreferredLanguages?: () => Promise<string[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
