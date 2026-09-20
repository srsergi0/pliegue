import { useEffect } from 'react';

interface UseKeyboardShortcutsParams {
  canExport: boolean;
  onOpen: () => void;
  onExport: () => void;
}

/**
 * Global workflow shortcuts: Ctrl/Cmd+O open, Ctrl/Cmd+S export.
 * Ignored while the user is typing in a form field.
 */
export function useKeyboardShortcuts({
  canExport,
  onOpen,
  onExport,
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canExport, onOpen, onExport]);
}
