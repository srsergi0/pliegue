import React from 'react';
import { Download, RefreshCw, FileUp, Sparkles, Printer } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { Button } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';

interface AppHeaderProps {
  hasPdf: boolean;
  isElectron: boolean;
  parsing: boolean;
  exporting: boolean;
  canExport: boolean;
  canPrint: boolean;
  onOpenTemplates: () => void;
  onOpenAnother: () => void;
  onPrint: () => void;
  onExport: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  hasPdf,
  isElectron,
  parsing,
  exporting,
  canExport,
  canPrint,
  onOpenTemplates,
  onOpenAnother,
  onPrint,
  onExport,
}) => {
  const { t } = useI18n();

  return (
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
        {hasPdf && isElectron && (
          <Button
            variant="secondary"
            onClick={onOpenAnother}
            disabled={parsing || exporting}
            title={t.actions.openAnotherTooltip}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>{t.actions.openAnother}</span>
          </Button>
        )}

        {hasPdf && (
          <Button
            variant="secondary"
            onClick={onPrint}
            disabled={parsing || exporting || !canPrint}
            title={t.actions.printTooltip}
            id="btn-print-sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.actions.print}</span>
          </Button>
        )}

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
