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

export interface UpdaterStatusData {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'dev-mode';
  version?: string;
  releaseDate?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  openPDFDialog: () => Promise<OpenPDFResult>;
  savePDF: (defaultName: string, bytes: Uint8Array) => Promise<SavePDFResult>;
  exportPDF: (params: {
    defaultName: string;
    sourcePath?: string;
    pdfBytes?: Uint8Array;
    plan: any;
    settings: any;
  }) => Promise<SavePDFResult>;
  openPath: (filePath: string) => Promise<string>;
  showInFolder: (filePath: string) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  getSystemLocale?: () => Promise<string>;
  getPreferredLanguages?: () => Promise<string[]>;
  checkForUpdates?: () => Promise<{ status: string; updateInfo?: any; message?: string }>;
  downloadUpdate?: () => Promise<{ status: string; message?: string }>;
  quitAndInstall?: () => Promise<void>;
  onUpdateStatus?: (callback: (data: UpdaterStatusData) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
