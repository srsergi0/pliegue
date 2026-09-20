import { useEffect } from 'react';

interface UseKeyboardShortcutsParams {
  canExport: boolean;
  canPrint: boolean;
  onOpen: () => void;
  onExport: () => void;
  onPrint: () => void;
}

/**
 * Global workflow shortcuts: Ctrl/Cmd+O open, Ctrl/Cmd+S export, Ctrl/Cmd+P print.
 * Ignored while the user is typing in a form field.
 */
export function useKeyboardShortcuts({
  canExport,
  canPrint,
  onOpen,
  onExport,
  onPrint,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input numérico o texto
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Ctrl+O o Cmd+O para abrir archivo
      if (mod && key === 'o') {
        e.preventDefault();
        onOpen();
      }

      // Ctrl+S o Cmd+S para exportar PDF
      if (mod && key === 's' && canExport) {
        e.preventDefault();
        onExport();
      }

      // Ctrl+P o Cmd+P para imprimir (diálogo del sistema)
      if (mod && key === 'p' && canPrint) {
        e.preventDefault();
        onPrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canExport, canPrint, onOpen, onExport, onPrint]);
}
