import React from 'react';
import { CheckCircle2, ExternalLink, FolderOpen, X } from 'lucide-react';
import { Button, IconButton } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';

interface SaveBannerProps {
  filePath: string | null;
  isElectron: boolean;
  onDismiss: () => void;
}

export const SaveBanner: React.FC<SaveBannerProps> = ({
  filePath,
  isElectron,
  onDismiss,
}) => {
  const { t } = useI18n();

  if (!filePath) return null;

  return (
    <aside
      aria-label="Archivo guardado exitosamente"
      className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-semibold">{t.actions.pdfSavedSuccess}</span>
        <span className="text-emerald-700 font-mono text-[11px] truncate max-w-md bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200/60">
          {filePath}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isElectron && (
          <>
            <Button
              variant="emerald"
              size="sm"
              onClick={() => window.electronAPI?.openPath(filePath)}
            >
              <ExternalLink className="w-3 h-3" />
              <span>{t.actions.openPdf}</span>
            </Button>
            <Button
              variant="emeraldOutline"
              size="sm"
              onClick={() => window.electronAPI?.showInFolder(filePath)}
            >
              <FolderOpen className="w-3 h-3" />
              <span>{t.actions.showInFolder}</span>
            </Button>
          </>
        )}
        <IconButton
          tone="emerald"
          onClick={onDismiss}
          title={t.actions.closeNotification}
        >
          <X className="w-3.5 h-3.5" />
        </IconButton>
      </div>
    </aside>
  );
};
