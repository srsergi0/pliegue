import { useState, useMemo, useEffect } from 'react';
import { ImpositionSettings, ImposedSheet } from './types';
import { generateImpositionPlan } from './utils/imposition';
import { ControlPanel } from './components/ControlPanel';
import { ImpositionPreview } from './components/ImpositionPreview';
import { StatusBar } from './app/StatusBar';
import { TemplatesModal } from './components/TemplatesModal';
import { UpdateBanner } from './components/UpdateBanner';
import { JobTemplate } from './constants/jobPresets';
import { DEFAULT_SETTINGS } from './constants/settings';
import { loadCustomTemplates, persistCustomTemplates, buildCustomTemplate } from './utils/customTemplates';
import { useI18n } from './i18n/I18nContext';
import { AlertCircle } from 'lucide-react';
import { AppHeader } from './app/AppHeader';
import { WelcomeScreen } from './app/WelcomeScreen';
import { SaveBanner } from './app/SaveBanner';
import { Toast } from './app/Toast';
import { usePdfDocument } from './hooks/usePdfDocument';
import { useImpositionExport } from './hooks/useImpositionExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const { t } = useI18n();

  const [settings, setSettings] = useState<ImpositionSettings>(DEFAULT_SETTINGS);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<JobTemplate[]>(() => loadCustomTemplates());
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);

  const {
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
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleOpenAnotherFile,
    handleLoadSamplePDF,
    handleRemoveFile,
  } = usePdfDocument(setSettings);

  const handleApplyTemplate = (tmpl: JobTemplate) => {
    setSettings((prev) => ({
      ...prev,
      ...tmpl.settings,
    }));
    const displayTitle = t.templates.presets[tmpl.id]?.title ?? tmpl.title;
    setToastMsg(`✓ ${t.actions.appliedTemplate}: ${displayTitle}`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveCustomTemplate = (name: string): string | null => {
    const clean = name.trim();
    if (!clean) return t.templates.nameRequired;
    const exists = customTemplates.some(
      (tmpl) => tmpl.title.toLowerCase() === clean.toLowerCase()
    );
    if (exists) return t.templates.nameExists;
    const created = buildCustomTemplate(clean, { ...settings }, {
      badge: t.templates.customBadge,
      prefix: t.templates.customDescPrefix,
    });
    const next = [created, ...customTemplates];
    setCustomTemplates(next);
    persistCustomTemplates(next);
    setToastMsg(`✓ ${t.actions.savedTemplate}: ${clean}`);
    setTimeout(() => setToastMsg(null), 3500);
    return null;
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const next = customTemplates.filter((tmpl) => tmpl.id !== id);
    setCustomTemplates(next);
    persistCustomTemplates(next);
  };

  // Compute imposition plan reactively based on settings and loaded PDF
  const plan: ImposedSheet[] = useMemo(() => {
    return generateImpositionPlan(settings, sourcePDFInfo, {
      sheet: t.sheets.sheet,
      front: t.sheets.front,
      back: t.sheets.back,
      pressFront: t.sheets.pressFront,
      pressBack: t.sheets.pressBack,
      faceFront: t.sheets.faceFront,
      faceBack: t.sheets.faceBack,
      crossFold8: t.sheets.crossFold8,
      twinBooklets: t.sheets.twinBooklets,
      signaturesOf: t.sheets.signaturesOf,
      bookletCutNest: t.sheets.bookletCutNest,
      cutAndStack: t.sheets.cutAndStack,
      repeatedPage: t.sheets.repeatedPage,
      repeatedSheet: t.sheets.repeatedSheet,
      sheetOf: t.sheets.sheetOf,
    });
  }, [settings, sourcePDFInfo, t]);

  const { exporting, handleExportFinalPDF } = useImpositionExport({
    pdfBytes,
    sourcePDFInfo,
    plan,
    settings,
    onSaved: setSavedFilePath,
    onError: setErrorMsg,
  });

  useKeyboardShortcuts({
    canExport: !!pdfBytes && plan.length > 0 && !exporting,
    onOpen: handleOpenAnotherFile,
    onExport: handleExportFinalPDF,
  });

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

  const hasPdf = !!pdfBytes;
  const canExport = hasPdf && plan.length > 0;

  return (
    <div className="h-full overflow-hidden bg-neutral-50 text-neutral-800 flex flex-col font-sans selection:bg-neutral-200 relative">
      {/* Hidden file input for web fallback */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="hidden"
        id="hidden-global-file-input"
      />

      <AppHeader
        hasPdf={hasPdf}
        isElectron={isElectron}
        sourcePDFInfo={sourcePDFInfo}
        parsing={parsing}
        exporting={exporting}
        canExport={canExport}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenAnother={handleOpenAnotherFile}
        onRemoveFile={handleRemoveFile}
        onExport={handleExportFinalPDF}
      />

      {/* Auto-Update Banner */}
      <UpdateBanner />

      {/* Desktop Saved Notification Banner */}
      <SaveBanner
        filePath={savedFilePath}
        isElectron={isElectron}
        onDismiss={() => setSavedFilePath(null)}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0 min-h-0">
        {!hasPdf ? (
          <WelcomeScreen
            errorMsg={errorMsg}
            parsing={parsing}
            dragOver={dragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onOpenFile={handleOpenAnotherFile}
            onLoadSample={handleLoadSamplePDF}
          />
        ) : (
          /* Full Screen Workspace Layout when PDF is loaded */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-w-0 min-h-0">
            {/* Left Column: Precise Controls */}
            <aside className="w-full lg:w-95 shrink-0 border-r border-neutral-200/80 bg-neutral-50/20 flex flex-col min-h-0 max-h-112.5 lg:max-h-none">
              <ControlPanel
                settings={settings}
                onChangeSettings={setSettings}
                sourcePDFInfo={sourcePDFInfo}
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

              <div className="flex-1 min-h-0 overflow-hidden">
                <ImpositionPreview
                  settings={settings}
                  onChangeSettings={setSettings}
                  plan={plan}
                  sourcePDFInfo={sourcePDFInfo}
                  pdfDocProxy={pdfDocProxy}
                  currentSheetIdx={currentSheetIdx}
                  onChangeSheetIdx={setCurrentSheetIdx}
                />
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Bottom status bar: production summary + current sheet info */}
      {hasPdf && (
        <StatusBar
          settings={settings}
          plan={plan}
          activeSheet={plan[currentSheetIdx]}
          currentSheetIdx={currentSheetIdx}
        />
      )}

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        currentSettings={settings}
        onApplyTemplate={handleApplyTemplate}
        customTemplates={customTemplates}
        onSaveCustom={handleSaveCustomTemplate}
        onDeleteCustom={handleDeleteCustomTemplate}
      />

      {/* Floating Toast Notification */}
      <Toast message={toastMsg} />
    </div>
  );
}
