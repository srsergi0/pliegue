/**
 * Declaraciones ambientales mínimas de los SDK de Electrobun para `tsc`.
 * En build/dev real los módulos se resuelven vía el devkit de Hutch
 * (alias de Vite + proyección de tipos); aquí solo se modela lo que usa Pliegue.
 */
declare module 'electrobun' {
  export type ElectrobunConfig = {
    app?: unknown;
    build?: unknown;
  };
}

declare module 'electrobun/main' {
  import type { PliegueRPCSchema } from '../shared/pliegue-rpc';

  export class BrowserWindow {
    constructor(options: {
      title: string;
      url: string;
      frame: { x?: number; y?: number; width: number; height: number };
      rpc?: unknown;
    });
    readonly webview: {
      openDevTools(): void;
      closeDevTools(): void;
      toggleDevTools(): void;
    };
    show(): void;
    hide(): void;
    close(): void;
    minimize(): void;
    unminimize(): void;
    maximize(): void;
    unmaximize(): void;
    isMaximized(): boolean;
    center(): void;
  }

  export const Utils: {
    paths: {
      home: string;
      documents: string;
      downloads: string;
      desktop: string;
      pictures: string;
      [key: string]: string;
    };
    openFileDialog(opts: {
      startingFolder?: string;
      allowedFileTypes?: string;
      canChooseFiles?: boolean;
      canChooseDirectory?: boolean;
      allowsMultipleSelection?: boolean;
    }): Promise<string[]>;
    openPath(path: string): boolean;
    showItemInFolder(path: string): void;
  };

  export const Updater: {
    localInfo: {
      channel(): Promise<string>;
    };
  };

  export function defineElectrobunRPC<Schema>(side: 'bun', config: {
    handlers: {
      requests?: Record<string, (params: never) => unknown>;
      messages?: Record<string, (payload: never) => void>;
    };
    maxRequestTime?: number;
  }): {
    request<T = unknown>(method: string, params?: unknown): Promise<T>;
  };

  export type { PliegueRPCSchema };
}

declare module 'electrobun/view' {
  export function defineElectrobunRPC<Schema>(side: 'webview', config: {
    handlers?: {
      requests?: Record<string, (params: never) => unknown>;
      messages?: Record<string, (payload: never) => void>;
    };
    maxRequestTime?: number;
  }): {
    request<T = unknown>(method: string, params?: unknown): Promise<T>;
  };

  export class Electroview {
    constructor(config: { rpc: unknown });
  }
}
