import { useState, useRef, ChangeEvent, DragEvent, Dispatch, SetStateAction } from 'react';
import { ImpositionSettings, PDFSourceInfo } from '../types';
import { pdfjs } from '../utils/pdfSetup';
import { en as enFallback } from '../i18n/locales/en';
import { useI18n } from '../i18n/I18nContext';

/**
 * Owns the loaded PDF document state and every file-parsing workflow:
 * native dialog / web upload / drag & drop, sample PDF generation and reset.
 */
export function usePdfDocument(
  setSettings: Dispatch<SetStateAction<ImpositionSettings>>
) {
  const { t } = useI18n();

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [sourcePDFInfo, setSourcePDFInfo] = useState<PDFSourceInfo | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  // Parse a PDF file and extract pages and metadata
  const processPDFBytes = async (
    bytes: Uint8Array,
    fileName: string,
    fileSize: number,
    filePath?: string
  ) => {
    setParsing(true);
    setErrorMsg(null);
    setSavedFilePath(null);
    try {
      // Only slice for the worker so pdfjs doesn't detach or mutate the stored bytes
      const workerCopy = bytes.slice();

      const loadingTask = pdfjs.getDocument({ data: workerCopy });
      const doc = await loadingTask.promise;
      const pageCount = doc.numPages;

      if (pageCount === 0) {
        throw new Error(t.errors.invalidPdf);
      }

      const pages: { width: number; height: number }[] = [];
      let firstW = 210;
      let firstH = 297;
      let doublePageCount = 0;

      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const originalViewport = page.getViewport({ scale: 1.0 });
        // points to mm
        const wMm = (originalViewport.width * 25.4) / 72;
        const hMm = (originalViewport.height * 25.4) / 72;

        if (i === 1) {
          firstW = wMm;
          firstH = hMm;
        }
        if (wMm > hMm * 1.15) {
          doublePageCount++;
        }
        pages.push({ width: wMm, height: hMm });
      }

      setSourcePDFInfo({
        name: fileName,
        filePath,
        size: fileSize,
        pageCount,
        doublePageCount,
        firstPageWidth: firstW,
        firstPageHeight: firstH,
        pages,
      });

      setPdfBytes(bytes);
      setPdfDocProxy(doc);

      // Reset document-specific settings from previous file
      setSettings((prev) => ({
        ...prev,
        excludedPageIndices: [],
        signatureSize: prev.signatureSize > pageCount ? 0 : prev.signatureSize,
      }));
    } catch (err: any) {
      console.error('Error procesando PDF:', err);
      setErrorMsg(err.message || 'Error al decodificar el archivo PDF. Intenta con otro.');
    } finally {
      setParsing(false);
    }
  };

  // Diálogo nativo de Electron para abrir archivo
  const handleOpenNativeDialog = async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.openPDFDialog();
      if (!res.canceled && res.data && res.name) {
        await processPDFBytes(res.data, res.name, res.data.length, res.path);
      }
    } catch (err) {
      console.error('Error al abrir diálogo nativo:', err);
    }
  };

  // Handle local file uploads (fallback web)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = (file as any).path || undefined;
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    await processPDFBytes(bytes, file.name, file.size, filePath);
    // Limpiar input
    e.target.value = '';
  };

  // Drag and drop handlers exclusivos para la tarjeta central de la pantalla de inicio
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      const filePath = (file as any).path || undefined;
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      await processPDFBytes(bytes, file.name, file.size, filePath);
    } else {
      setErrorMsg(t.errors.dragOnlyPdf);
    }
  };

  const handleOpenAnotherFile = () => {
    if (isElectron) {
      handleOpenNativeDialog();
    } else {
      hiddenFileInputRef.current?.click();
    }
  };

  // Standard PDF fonts (Helvetica) only support WinAnsi (Latin) encoding,
  // so CJK sample strings must fall back to English to avoid a crash.
  const winAnsiSafe = (text: string): boolean => {
    for (const ch of text) {
      const code = ch.codePointAt(0) ?? 0;
      if (code > 0xff) return false;
      if (code >= 0x80 && code <= 0x9f) return false;
    }
    return true;
  };

  // Programmatically generate a sample PDF (8, 16 or 32 pages) to allow instant testing
  const handleLoadSamplePDF = async (pageCount: number = 8) => {
    setParsing(true);
    setErrorMsg(null);
    setSavedFilePath(null);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Fall back to English when the current language uses non-Latin glyphs
      const pickSafe = (localized: string, fallback: string) =>
        winAnsiSafe(localized) ? localized : fallback;
      const pageWord = pickSafe(t.welcome.samplePageWord, enFallback.welcome.samplePageWord);
      const docTitle = pickSafe(t.welcome.sampleTitle, enFallback.welcome.sampleTitle);
      const docSubtitle = pickSafe(t.welcome.sampleSubtitle, enFallback.welcome.sampleSubtitle);

      const colors = [
        rgb(0.96, 0.96, 0.96), // soft silver
        rgb(0.94, 0.95, 0.93), // soft sage
        rgb(0.93, 0.94, 0.96), // soft slate
        rgb(0.97, 0.95, 0.92), // soft warm sand
        rgb(0.95, 0.93, 0.95), // soft lavender
        rgb(0.93, 0.95, 0.95), // soft mist
        rgb(0.96, 0.94, 0.92), // soft peach
        rgb(0.94, 0.94, 0.94), // warm concrete
      ];

      for (let i = 1; i <= pageCount; i++) {
        const page = pdfDoc.addPage([595.27, 841.89]);
        const color = colors[(i - 1) % colors.length];

        page.drawRectangle({
          x: 0,
          y: 0,
          width: 595.27,
          height: 841.89,
          color,
        });

        page.drawRectangle({
          x: 30,
          y: 30,
          width: 595.27 - 60,
          height: 841.89 - 60,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        page.drawText(`${pageWord} ${i}`, {
          x: 180,
          y: 440,
          size: 40,
          font,
          color: rgb(0.12, 0.12, 0.12),
        });

        page.drawText(docTitle, {
          x: 110,
          y: 400,
          size: 11,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });

        page.drawText(docSubtitle, {
          x: 130,
          y: 80,
          size: 9,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      const bytes = await pdfDoc.save();
      await processPDFBytes(bytes, `documento_prueba_imposicion_${pageCount}p.pdf`, bytes.length);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(t.errors.demoFailed);
    } finally {
      setParsing(false);
    }
  };

  const handleRemoveFile = () => {
    setPdfBytes(null);
    setPdfDocProxy(null);
    setSourcePDFInfo(null);
    setErrorMsg(null);
    setSavedFilePath(null);
    setSettings((prev) => ({
      ...prev,
      excludedPageIndices: [],
    }));
  };

  return {
    pdfBytes,
    pdfDocProxy,
    sourcePDFInfo,
    parsing,
    dragOver,
    errorMsg,
    setErrorMsg,
    savedFilePath,
    setSavedFilePath,
    hiddenFileInputRef,
    isElectron,
    processPDFBytes,
    handleOpenNativeDialog,
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleOpenAnotherFile,
    handleLoadSamplePDF,
    handleRemoveFile,
  };
}
