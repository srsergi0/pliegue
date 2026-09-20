import React from 'react';
import { Download, RefreshCw, FileUp, Sparkles, X } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { Button, IconButton } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { PDFSourceInfo } from '../types';

interface AppHeaderProps {
  hasPdf: boolean;
  isElectron: boolean;
  sourcePDFInfo: PDFSourceInfo | null;
  parsing: boolean;
  exporting: boolean;
  canExport: boolean;
  onOpenTemplates: () => void;
  onOpenAnother: () => void;
  onRemoveFile: () => void;
  onExport: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  hasPdf,
  isElectron,
  sourcePDFInfo,
  parsing,
  exporting,
  canExport,
  onOpenTemplates,
  onOpenAnother,
  onRemoveFile,
  onExport,
}) => {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 z-40 px-6 py-3 flex items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-mono font-bold text-sm tracking-tighter shadow-sm select-none shrink-0">
          {t.app.brandTag}
        </div>
        <div className="min-w-0 flex-1">
          {sourcePDFInfo ? (
            <div className="flex items-center gap-2 min-w-0">
              <h1
                className="text-sm font-bold text-neutral-900 tracking-tight truncate"
                title={sourcePDFInfo.name}
              >
                {sourcePDFInfo.name}
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAnother}
                disabled={parsing || exporting}
                title={t.actions.openAnotherTooltip}
                className="shrink-0"
                id="btn-open-another"
              >
                <FileUp className="w-3 h-3 text-neutral-500" />
                <span>{t.actions.openAnother}</span>
              </Button>
              <IconButton
                tone="danger"
                size="sm"
                onClick={onRemoveFile}
                disabled={parsing || exporting}
                title={t.actions.removeFile}
                className="shrink-0"
                id="btn-remove-file"
              >
                <X className="w-4 h-4" />
              </IconButton>
            </div>
          ) : (
            <h1 className="text-sm font-bold text-neutral-900 tracking-tight">{t.app.title}</h1>
          )}
          <p className="text-[10px] text-neutral-400 truncate mt-0.5">
            {sourcePDFInfo
              ? `${sourcePDFInfo.pageCount} ${t.preview.sourcePages} · ${(sourcePDFInfo.size / (1024 * 1024)).toFixed(2)} MB · ${sourcePDFInfo.firstPageWidth.toFixed(0)}×${sourcePDFInfo.firstPageHeight.toFixed(0)} mm`
              : t.app.subtitle}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        {!hasPdf && <LanguageSelector />}
        <Button
          variant="amber"
          onClick={onOpenTemplates}
          title={t.actions.templatesTooltip}
          id="btn-open-templates"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>{t.actions.templates}</span>
        </Button>

        {hasPdf && (
          <Button
            variant="primary"
            size="mdWide"
            onClick={onExport}
            disabled={exporting || !canExport}
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
          </Button>
        )}
      </div>
    </header>
  );
};
