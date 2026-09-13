/**
 * Stub de `electrobun/view` para builds SIN devkit de Hutch (p. ej. CI de Electron).
 * Solo se empaqueta cuando no hay devkit; en runtime nunca se usa porque
 * todo el código Electrobun va tras `isElectrobun` (falso en Electron/web).
 */
export class Electroview {
  constructor(_config: { rpc: unknown }) {
    throw new Error('Electrobun no disponible en esta compilación.');
  }

  static defineRPC(_config: unknown): never {
    throw new Error('Electrobun no disponible en esta compilación.');
  }
}
