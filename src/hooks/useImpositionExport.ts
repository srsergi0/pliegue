import { useState } from 'react';
import { ImpositionSettings, ImposedSheet, PDFSourceInfo } from '../types';
import { generateImposedPDF } from '../utils/pdfGenerator';
import { useI18n } from '../i18n/I18nContext';

interface UseImpositionExportParams {
  pdfBytes: Uint8Array | null;
  sourcePDFInfo: PDFSourceInfo | null;
  plan: ImposedSheet[];
  settings: ImpositionSettings;
  onSaved: (filePath: string) => void;
  onError: (message: string | null) => void;
}

/**
 * Handles saving the imposed PDF (native Electron or web download) and
 * printing the active sheet through the system print dialog.
 */
export function useImpositionExport({
  pdfBytes,
  sourcePDFInfo,
  plan,
  settings,
  onSaved,
  onError,
}: UseImpositionExportParams) {
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);

  // Exportar PDF imposicionado (Nativo en Electron o Descarga en Web)
  const handleExportFinalPDF = async () => {
    if (!pdfBytes || !sourcePDFInfo) return;
    setExporting(true);
    onError(null);
    try {
      const cleanName = sourcePDFInfo.name.replace(/\.[^/.]+$/, '');
      const defaultFileName = `pliegue_${cleanName}_${settings.sheetPreset}.pdf`;

      if (window.electronAPI?.exportPDF) {
        // En Electron usamos el proceso principal (Node.js 64-bit sin límites de memoria del renderer)
        const result = await window.electronAPI.exportPDF({
          defaultName: defaultFileName,
          sourcePath: sourcePDFInfo.filePath,
          pdfBytes: sourcePDFInfo.filePath ? undefined : pdfBytes,
          plan,
          settings,
        });

        if (!result.canceled && result.filePath) {
          onSaved(result.filePath);
        } else if (result.error) {
          onError(`Error al guardar: ${result.error}`);
        }
      } else if (window.electronAPI) {
        // Fallback para preload que sólo tenga savePDF
        const outputBytes = await generateImposedPDF(pdfBytes, plan, settings);
        const result = await window.electronAPI.savePDF(defaultFileName, outputBytes);
        if (!result.canceled && result.filePath) {
          onSaved(result.filePath);
        } else if (result.error) {
          onError(`Error al guardar: ${result.error}`);
        }
      } else {
        // Fallback web (usa generateImposedPDF optimizado con embedPages batch)
        const outputBytes = await generateImposedPDF(pdfBytes, plan, settings);
        const blob = new Blob([outputBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      // Out-of-memory during stream copy (large source PDF): show actionable message
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      const isMemoryError =
        err instanceof RangeError ||
        /array buffer|out of memory|allocation failed/i.test(msg);
      onError(isMemoryError ? t.errors.exportTooLarge : t.errors.exportFailed);
    } finally {
      setExporting(false);
    }
  };

  // Imprimir pliego activo con el diálogo de impresión del sistema
  const handlePrint = () => {
    if (!pdfBytes || plan.length === 0) return;
    window.print();
  };

  return { exporting, handleExportFinalPDF, handlePrint };
}
