import { useState, useMemo, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import { ImpositionSettings, ImposedSheet, PDFSourceInfo } from './types';
import { generateImpositionPlan } from './utils/imposition';
import { generateImposedPDF } from './utils/pdfGenerator';
import { ControlPanel } from './components/ControlPanel';
import { ImpositionPreview } from './components/ImpositionPreview';
import { TemplatesModal } from './components/TemplatesModal';
import { LanguageSelector } from './components/LanguageSelector';
import { UpdateBanner } from './components/UpdateBanner';
import { WORKSHOP_PRESETS, JobTemplate } from './constants/jobPresets';
import { useI18n } from './i18n/I18nContext';
import {
  Upload,
  Download,
  RefreshCw,
  FileCode,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  X,
  FileUp,
  Laptop,
  Sparkles,
} from 'lucide-react';
import { pdfjs } from './utils/pdfSetup';

const DEFAULT_SETTINGS: ImpositionSettings = {
  sheetPreset: 'A4',
  sheetWidth: 210,
  sheetHeight: 297,
  sheetOrientation: 'landscape',
  targetPagePreset: 'auto',
  targetPageWidth: 148.5,
  targetPageHeight: 210,
  gridCols: 2,
  gridRows: 1,
  layoutMode: 'booklet',
  duplexMode: 'long_edge',
  gridOrder: 'rows',
  bindingEdge: 'left',
  signatureSize: 0,
  duplexItemMode: 'two_page_items',
  booklet4UpMode: 'cut_and_nest',
  splitDoubleSpreads: false,
  excludedPageIndices: [],
  pageRotation: 0,
  reverseRotation: 0,
  autoRotateToFit: true,
  scaleMode: 'fit',
  customScale: 100,
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  gutterHorizontal: 0,
  gutterVertical: 0,
  drawCropMarks: true,
  cropMarkLength: 5,
  bleed: 2,
};

export default function App() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<ImpositionSettings>(DEFAULT_SETTINGS);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [sourcePDFInfo, setSourcePDFInfo] = useState<PDFSourceInfo | null>(null);
  const [parsing, setParsing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  const handleApplyTemplate = (tmpl: JobTemplate) => {
    setSettings((prev) => ({
      ...prev,
      ...tmpl.settings,
    }));
    setToastMsg(`✓ ${t.actions.appliedTemplate}: ${tmpl.title}`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleOpenAnotherFile = () => {
    if (isElectron) {
      handleOpenNativeDialog();
    } else {
      hiddenFileInputRef.current?.click();
    }
  };

  // Parse a PDF file and extract pages and metadata
  const processPDFBytes = async (bytes: Uint8Array, fileName: string, fileSize: number) => {
    setParsing(true);
    setErrorMsg(null);
    setSavedFilePath(null);
    try {
      // Safe copies to ensure the ArrayBuffer is never detached or transferred
      const storedBytes = new Uint8Array(bytes.slice());
      const workerCopy = new Uint8Array(bytes.slice());

      const loadingTask = pdfjs.getDocument({ data: workerCopy });
      const doc = await loadingTask.promise;
      const pageCount = doc.numPages;

      if (pageCount === 0) {
        throw new Error('El PDF no tiene páginas válidas.');
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
        size: fileSize,
        pageCount,
        doublePageCount,
        firstPageWidth: firstW,
        firstPageHeight: firstH,
        pages,
      });

      setPdfBytes(storedBytes);
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
        await processPDFBytes(res.data, res.name, res.data.length);
      }
    } catch (err) {
      console.error('Error al abrir diálogo nativo:', err);
    }
  };

  // Handle local file uploads (fallback web)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    await processPDFBytes(bytes, file.name, file.size);
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
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      await processPDFBytes(bytes, file.name, file.size);
    } else {
      setErrorMsg('Por favor arrastra únicamente archivos con formato PDF.');
    }
  };

  // Programmatically generate an 8-page sample PDF to allow instant testing
  const handleLoadSamplePDF = async () => {
    setParsing(true);
    setErrorMsg(null);
    setSavedFilePath(null);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

      for (let i = 1; i <= 8; i++) {
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

        page.drawText(`PÁGINA ${i}`, {
          x: 180,
          y: 440,
          size: 40,
          font,
          color: rgb(0.12, 0.12, 0.12),
        });

        page.drawText(`DOCUMENTO DE PRUEBA DE IMPOSICIÓN`, {
          x: 110,
          y: 400,
          size: 11,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });

        page.drawText(`Fidelidad de corte e imposición digital en tiempo real`, {
          x: 130,
          y: 80,
          size: 9,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      const bytes = await pdfDoc.save();
      await processPDFBytes(bytes, 'documento_prueba_imposicion.pdf', bytes.length);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al generar el documento de demostración.');
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

  // Compute imposition plan reactively based on settings and loaded PDF
  const plan: ImposedSheet[] = useMemo(() => {
    return generateImpositionPlan(settings, sourcePDFInfo);
  }, [settings, sourcePDFInfo]);

  // Exportar PDF imposicionado (Nativo en Electron o Descarga en Web)
  const handleExportFinalPDF = async () => {
    if (!pdfBytes || !sourcePDFInfo) return;
    setExporting(true);
    setErrorMsg(null);
    try {
      const outputBytes = await generateImposedPDF(pdfBytes, plan, settings);
      const cleanName = sourcePDFInfo.name.replace(/\.[^/.]+$/, "");
      const defaultFileName = `pliegue_${cleanName}_${settings.sheetPreset}.pdf`;

      if (window.electronAPI) {
        const result = await window.electronAPI.savePDF(defaultFileName, outputBytes);
        if (!result.canceled && result.filePath) {
          setSavedFilePath(result.filePath);
        } else if (result.error) {
          setErrorMsg(`Error al guardar: ${result.error}`);
        }
      } else {
        // Fallback web
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
      setErrorMsg('Error al ensamblar el PDF final. Verifica los parámetros de márgenes o grilla.');
    } finally {
      setExporting(false);
    }
  };

  // Atajos de teclado para flujo de trabajo rápido sin barra de menús
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input numérico o texto
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // Ctrl+O o Cmd+O para abrir archivo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (isElectron) {
          handleOpenNativeDialog();
        } else {
          document.getElementById('file-upload-input')?.click();
        }
      }

      // Ctrl+S o Cmd+S para exportar PDF
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (pdfBytes && plan.length > 0 && !exporting) {
          e.preventDefault();
          handleExportFinalPDF();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isElectron, pdfBytes, plan, exporting]);

  // Evitar que el navegador o Electron navegue al archivo si se suelta fuera de la tarjeta
  useEffect(() => {
    const preventDrag = (e: globalThis.DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDrag);
    window.addEventListener('drop', preventDrag);
    return () => {
      window.removeEventListener('dragover', preventDrag);
      window.removeEventListener('drop', preventDrag);
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 flex flex-col font-sans selection:bg-neutral-200 relative overflow-x-clip">
      {/* Hidden file input for web fallback */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="hidden"
        id="hidden-global-file-input"
      />

      {/* Header bar */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 z-40 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-mono font-bold text-sm tracking-tighter shadow-sm select-none">
            {t.app.brandTag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-neutral-900 tracking-tight">{t.app.title}</h1>
            </div>
            <p className="text-[10px] text-neutral-400">{t.app.subtitle}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {!pdfBytes && <LanguageSelector />}
          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 bg-amber-50 hover:bg-amber-100/90 border border-amber-200/90 text-amber-950 px-3 py-2 rounded-lg transition-all shadow-2xs cursor-pointer select-none"
            title={t.actions.templatesTooltip}
            id="btn-open-templates"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{t.actions.templates}</span>
          </button>
          {pdfBytes && isElectron && (
            <button
              onClick={handleOpenNativeDialog}
              disabled={parsing || exporting}
              className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs px-3 py-2 rounded-lg transition-all border border-neutral-200 cursor-pointer select-none"
              title={t.actions.openAnotherTooltip}
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{t.actions.openAnother}</span>
            </button>
          )}

          {pdfBytes && (
            <button
              onClick={handleExportFinalPDF}
              disabled={exporting || plan.length === 0}
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:hover:bg-neutral-900 shadow-xs cursor-pointer select-none"
              id="btn-export-pdf"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.actions.exportPdfProcessing}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{isElectron ? t.actions.savePdf : t.actions.exportPdf}</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Auto-Update Banner */}
      <UpdateBanner />

      {/* Desktop Saved Notification Banner */}
      {savedFilePath && (
        <aside
          aria-label="Archivo guardado exitosamente"
          className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{t.actions.pdfSavedSuccess}</span>
            <span className="text-emerald-700 font-mono text-[11px] truncate max-w-md bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200/60">
              {savedFilePath}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isElectron && (
              <>
                <button
                  onClick={() => window.electronAPI?.openPath(savedFilePath)}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{t.actions.openPdf}</span>
                </button>
                <button
                  onClick={() => window.electronAPI?.showInFolder(savedFilePath)}
                  className="flex items-center gap-1.5 bg-white hover:bg-emerald-100/60 text-emerald-800 border border-emerald-300 font-medium px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>{t.actions.showInFolder}</span>
                </button>
              </>
            )}
            <button
              onClick={() => setSavedFilePath(null)}
              className="p-1 text-emerald-600 hover:text-emerald-900 rounded hover:bg-emerald-100/80 cursor-pointer"
              title={t.actions.closeNotification}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0">

        {/* Onboarding / PDF Loading state */}
        {!pdfBytes ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full min-w-0">

            {/* Title intro */}
            <div className="text-center mb-8 max-w-lg select-none">
              <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight mb-2">
                {t.welcome.heroTitle}
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {t.welcome.heroDescription}
              </p>
            </div>

            {/* Error badge */}
            {errorMsg && (
              <div className="mb-4 w-full max-w-md bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-xs flex gap-2.5 items-center select-none">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Central Drop Zone Card */}
            <div
              onClick={handleOpenAnotherFile}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full max-w-xl aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all duration-200 relative cursor-pointer ${dragOver
                  ? 'border-amber-500 bg-amber-50/60 ring-4 ring-amber-500/20 scale-[1.01]'
                  : 'border-neutral-300 hover:border-neutral-400 bg-white shadow-xs'
                }`}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-neutral-400" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-700">{t.welcome.analyzingPdf}</p>
                    <p className="text-[10px] text-neutral-400">{t.welcome.analyzingPdfSubtitle}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 select-none">
                  <div className={`p-3 rounded-full transition-all ${dragOver ? 'bg-amber-100 text-amber-600 scale-110' : 'bg-neutral-100 text-neutral-500'}`}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-700">
                      {dragOver ? (
                        <span className="text-amber-700 font-bold text-sm">{t.actions.dropPdfActive}</span>
                      ) : (
                        <>
                          {t.actions.dropPdfHere} <span className="text-neutral-950 underline decoration-2">{t.welcome.browseInPc}</span>
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">{t.welcome.dragDropSubtitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAnotherFile();
                    }}
                    className="mt-1 flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>{t.actions.selectPdfFile}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Templates Suggestion Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 select-none">
              <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{t.welcome.popularTemplates}</span>
              </span>
              {WORKSHOP_PRESETS.slice(0, 4).map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200/90 px-2.5 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer"
                  title={tmpl.description}
                >
                  <span>{tmpl.icon}</span>
                  <span>{tmpl.badge}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsTemplatesOpen(true)}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200/80 transition-colors cursor-pointer"
              >
                Ver todas →
              </button>
            </div>

            {/* Demo test section */}
            <div className="mt-6 flex flex-col items-center gap-2 select-none">
              <span className="text-[11px] text-neutral-400">¿No tienes un PDF a mano para probar?</span>
              <button
                onClick={handleLoadSamplePDF}
                disabled={parsing}
                className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border border-neutral-200 font-semibold text-xs px-4 py-2.5 rounded-lg transition-all cursor-pointer"
                id="btn-sample-pdf"
              >
                <FileCode className="w-3.5 h-3.5 text-neutral-500" />
                <span>Generar PDF de prueba (8 páginas)</span>
              </button>
            </div>

          </div>
        ) : (

          /* Full Screen Workspace Layout when PDF is loaded */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-w-0">

            {/* Left Column: Precise Controls */}
            <aside className="w-full lg:w-[380px] shrink-0 border-r border-neutral-200/80 bg-neutral-50/20 max-h-[450px] lg:max-h-none overflow-y-auto">
              <ControlPanel
                settings={settings}
                onChangeSettings={setSettings}
                sourcePDFInfo={sourcePDFInfo}
                onRemoveFile={handleRemoveFile}
                onOpenNewFile={handleOpenAnotherFile}
              />
            </aside>

            {/* Right Column: High Fidelity WYSIWYG Prepress Preview */}
            <section className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 lg:p-8 min-w-0">

              {/* Alert message if any */}
              {errorMsg && (
                <div className="mb-4 bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-xs flex gap-2 items-center select-none">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex-1">
                <ImpositionPreview
                  settings={settings}
                  onChangeSettings={setSettings}
                  plan={plan}
                  sourcePDFInfo={sourcePDFInfo}
                  pdfDocProxy={pdfDocProxy}
                />
              </div>

            </section>

          </div>
        )}

      </main>

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        currentSettings={settings}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-neutral-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 select-none">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  );
}
