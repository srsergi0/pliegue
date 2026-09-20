import React from 'react';
import { pdfjs } from '../../utils/pdfSetup';
import { ImpositionSettings } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { PageThumbnail } from './PageThumbnail';
import { EyeOff, RotateCcw, FileText } from 'lucide-react';
import { Button } from '../ui';

interface ExcludedPagesTrayProps {
  pageIndices: number[];
  pdfDocProxy: pdfjs.PDFDocumentProxy | null;
  settings: ImpositionSettings;
  onToggle: (pageIdx: number) => void;
  onRestoreAll?: () => void;
}

/**
 * Scrollable tray of disabled source pages; clicking one reactivates it.
 */
export const ExcludedPagesTray: React.FC<ExcludedPagesTrayProps> = ({
  pageIndices,
  pdfDocProxy,
  settings,
  onToggle,
  onRestoreAll,
}) => {
  const { t } = useI18n();

  if (!pageIndices || pageIndices.length === 0) return null;

  return (
    <div className="w-full max-w-[720px] bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60">
        <div className="flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-neutral-900">
              {t.preview.disabledPagesTitle} ({pageIndices.length})
            </span>
            <span className="text-[10px] text-neutral-500 hidden sm:inline">
              • {t.preview.disabledPagesHint}
            </span>
          </div>
        </div>
        {pageIndices.length > 1 && onRestoreAll && (
          <Button
            variant="outline"
            size="xs"
            onClick={onRestoreAll}
            className="text-rose-700 hover:text-rose-900 hover:bg-rose-100 border-rose-200 shadow-2xs"
          >
            {t.preview.restoreAll}
          </Button>
        )}
      </div>

      {/* Scrollable list with horizontal scroll */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
        {pageIndices
          .slice()
          .sort((a, b) => a - b)
          .map((pageIdx) => {
            return (
              <div
                key={`excluded-page-${pageIdx}`}
                onClick={() => onToggle(pageIdx)}
                title={t.preview.clickToEnableTooltip}
                className="group relative flex flex-col items-center shrink-0 w-20 bg-white border border-neutral-200 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-200 rounded-lg p-1.5 shadow-2xs cursor-pointer transition-all select-none"
              >
                {/* Thumbnail preview */}
                <div className="w-full aspect-[3/4] bg-neutral-100 rounded flex items-center justify-center overflow-hidden border border-neutral-100 relative">
                  {pdfDocProxy ? (
                    <div className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity">
                      <PageThumbnail
                        pdfDocument={pdfDocProxy}
                        pageIndex={pageIdx}
                        pagePart="full"
                        rotation={0}
                        cellWidthMm={40}
                        cellHeightMm={55}
                        settings={{ ...settings, scaleMode: 'fit', customScale: 100 }}
                      />
                    </div>
                  ) : (
                    <FileText className="w-5 h-5 text-neutral-400" />
                  )}

                  {/* Hover restore overlay */}
                  <div className="absolute inset-0 bg-emerald-700/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-0.5 transition-opacity rounded text-white">
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-[8px] font-bold uppercase tracking-wider">{t.preview.reactivate}</span>
                  </div>
                </div>

                {/* Page label and restore button */}
                <div className="flex items-center justify-between w-full mt-1.5 px-0.5">
                  <span className="text-[10px] font-bold font-mono text-neutral-700">
                    {t.preview.pageAbbr} {pageIdx + 1}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold group-hover:scale-125 transition-transform">
                    ↺
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
