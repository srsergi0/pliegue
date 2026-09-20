import React from 'react';
import { pdfjs } from '../../utils/pdfSetup';
import { ImpositionSettings } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { PageThumbnail } from './PageThumbnail';
import { IconButton } from '../ui';
import { EyeOff, RotateCcw, X } from 'lucide-react';

interface ExcludedPagesPanelProps {
  pageIndices: number[];
  pdfDocProxy: pdfjs.PDFDocumentProxy | null;
  settings: ImpositionSettings;
  onToggle: (pageIdx: number) => void;
  onRestoreAll?: () => void;
  onClose: () => void;
}

/**
 * Right-hand side panel listing disabled source pages. Clicking a row
 * reactivates it; the panel can be hidden from its header.
 */
export const ExcludedPagesPanel: React.FC<ExcludedPagesPanelProps> = ({
  pageIndices,
  pdfDocProxy,
  settings,
  onToggle,
  onRestoreAll,
  onClose,
}) => {
  const { t } = useI18n();

  if (!pageIndices || pageIndices.length === 0) return null;

  return (
    <aside className="w-52 shrink-0 flex flex-col bg-rose-50/60 border border-rose-200/80 rounded-xl overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 border-b border-rose-200/60 bg-rose-50/80">
        <EyeOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="text-[11px] font-bold text-neutral-900 truncate">
          {t.preview.disabledPagesTitle} ({pageIndices.length})
        </span>
        <span className="ml-auto flex items-center gap-0.5 shrink-0">
          {pageIndices.length > 1 && onRestoreAll && (
            <IconButton
              tone="emerald"
              size="sm"
              onClick={onRestoreAll}
              title={t.preview.restoreAll}
              id="btn-restore-all-pages"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </IconButton>
          )}
          <IconButton
            tone="neutral"
            size="sm"
            onClick={onClose}
            title={t.preview.hidePanel}
            id="btn-hide-excluded-panel"
          >
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </span>
      </header>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {pageIndices
          .slice()
          .sort((a, b) => a - b)
          .map((pageIdx) => (
            <button
              key={`excluded-page-${pageIdx}`}
              type="button"
              onClick={() => onToggle(pageIdx)}
              title={t.preview.clickToEnableTooltip}
              className="group w-full flex items-center gap-2 bg-white border border-neutral-200 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-200 rounded-lg p-1.5 cursor-pointer transition-all text-left select-none"
            >
              {/* Thumbnail */}
              <div className="relative w-10 shrink-0 aspect-[3/4] bg-neutral-100 rounded overflow-hidden border border-neutral-100">
                {pdfDocProxy ? (
                  <div className="w-full h-full opacity-70 group-hover:opacity-100 transition-opacity">
                    <PageThumbnail
                      pdfDocument={pdfDocProxy}
                      pageIndex={pageIdx}
                      pagePart="full"
                      rotation={0}
                      cellWidthMm={40}
                      cellHeightMm={53}
                      settings={{ ...settings, scaleMode: 'fit', customScale: 100 }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <EyeOff className="w-4 h-4" />
                  </div>
                )}
                <div className="absolute inset-0 bg-emerald-700/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Label */}
              <div className="min-w-0">
                <p className="text-[10px] font-bold font-mono text-neutral-700">
                  {t.preview.pageAbbr} {pageIdx + 1}
                </p>
                <p className="text-[9px] text-neutral-400 truncate">{t.preview.reactivate}</p>
              </div>
            </button>
          ))}
      </div>
    </aside>
  );
};
