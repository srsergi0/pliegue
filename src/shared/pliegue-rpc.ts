/**
 * Esquema RPC compartido entre el proceso main (Bun/Cottontail)
 * y la vista (React). Solo tipos: se importa con `import type`.
 *
 * Los binarios viajan como base64 (el transporte RPC es JSON).
 */

export type PliegueRPCSchema = {
  bun: {
    requests: {
      /** Diálogo abrir PDF. Devuelve la ruta elegida o null si se cancela. */
      pickPdf: {
        params: {};
        response: string | null;
      };
      /** Lee un PDF del disco. Devuelve nombre, tamaño y bytes en base64. */
      readPdf: {
        params: { path: string };
        response: { name: string; size: number; dataB64: string } | null;
      };
      /**
       * Elige carpeta con diálogo nativo y guarda el PDF imposicionado
       * como `<carpeta>/<defaultName>`. Devuelve la ruta final o null.
       */
      savePdf: {
        params: { defaultName: string; dataB64: string };
        response: string | null;
      };
      /** Abrir archivo con la app por defecto del sistema. */
      openPath: {
        params: { path: string };
        response: boolean;
      };
      /** Mostrar archivo resaltado en el explorador. */
      showInFolder: {
        params: { path: string };
        response: void;
      };
      /** Alternar DevTools de la vista (F12). */
      toggleDevTools: {
        params: {};
        response: void;
      };
      /** Controles de ventana (paridad con Electron). */
      windowControl: {
        params: { action: 'minimize' | 'maximize' | 'close' };
        response: void;
      };
    };
    messages: {};
  };
  webview: {
    requests: {};
    messages: {};
  };
};
