import React from 'react';
import { pdfjs } from '../../utils/pdfSetup';
import { ImpositionSettings, ImpositionCell } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { PageThumbnail } from './PageThumbnail';
import { pageLabelFor, courtesyLabelFor, getHeadIndicator } from './previewGeometry';
import { EyeOff } from 'lucide-react';

interface SheetCellProps {
  cell: ImpositionCell;
  pdfDocProxy: pdfjs.PDFDocumentProxy | null;
  settings: ImpositionSettings;
  sheetW: number;
  sheetH: number;
  interactive: boolean;
  onToggleExclude: (sourceIdx: number) => void;
}

/**
 * A single imposition cell positioned absolutely on the sheet: renders the
 * source page or a courtesy/blank placeholder, plus its badges.
 */
export const SheetCell: React.FC<SheetCellProps> = ({
  cell,
  pdfDocProxy,
  settings,
  sheetW,
  sheetH,
  interactive,
  onToggleExclude,
}) => {
  const { t } = useI18n();

  const cellLeft = (cell.x / sheetW) * 100;
  const cellTop = (cell.y / sheetH) * 100;
  const cellWPercent = (cell.width / sheetW) * 100;
  const cellHPercent = (cell.height / sheetH) * 100;

  const hasPage = cell.sourcePageIndex !== null;
  const pageLabel = pageLabelFor(t.preview, cell.sourcePageIndex, cell.pagePart, cell.isSpacerBlank);
  const headInfo = getHeadIndicator(t.preview, cell.rotation);

  return (
    <div
      onClick={() => {
        if (hasPage && interactive) {
          onToggleExclude(cell.sourcePageIndex!);
        }
      }}
      className={`absolute border border-neutral-200/90 bg-neutral-50 flex flex-col justify-between overflow-hidden transition-all ${
        hasPage ? 'cursor-pointer group hover:ring-2 hover:ring-rose-500/80 hover:border-rose-400' : ''
      }`}
      style={{
        left: `${cellLeft}%`,
        top: `${cellTop}%`,
        width: `${cellWPercent}%`,
        height: `${cellHPercent}%`,
      }}
      title={hasPage ? t.preview.clickToDisableTooltip : undefined}
    >
      {/* Action badge on hover to disable page */}
      {hasPage && interactive && (
        <div className="absolute top-1 right-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="flex items-center gap-1 bg-rose-600 text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow-xs">
            <EyeOff className="w-2.5 h-2.5" />
            <span>{t.preview.deactivate}</span>
          </span>
        </div>
      )}

      {/* Actual Page Rendering */}
      {hasPage && pdfDocProxy ? (
        <PageThumbnail
          pdfDocument={pdfDocProxy}
          pageIndex={cell.sourcePageIndex!}
          pagePart={cell.pagePart}
          rotation={cell.rotation}
          cellWidthMm={cell.width}
          cellHeightMm={cell.height}
          settings={settings}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 relative select-none bg-neutral-100/40 text-center">
          <svg className="absolute inset-0 w-full h-full text-neutral-200/70 pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
          </svg>
          <span className="z-10 text-[10px] font-mono uppercase tracking-wider">
            {cell.isSpacerBlank ? (
              <span className="text-amber-800 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded text-[8.5px] font-bold shadow-2xs">
                {courtesyLabelFor(t.preview, cell.spacerReason)}
              </span>
            ) : (
              <span className="text-neutral-400">{t.preview.blankPage}</span>
            )}
          </span>
        </div>
      )}

      {/* Header Badge: Page number & angle */}
      <div className="absolute top-1 left-1 bg-neutral-900/80 text-[9px] text-white font-mono px-1.5 py-0.5 rounded-xs pointer-events-none z-20 flex items-center gap-1 select-none backdrop-blur-xs">
        <span className="font-bold">{pageLabel}</span>
        {hasPage && (
          <span className="text-neutral-300 font-normal">({cell.rotation}°)</span>
        )}
      </div>

      {/* Orientation Indicator (Head of the page) */}
      {hasPage && (
        <div
          className="absolute bottom-1 right-1 bg-neutral-900/80 text-[8px] text-white font-semibold px-1.5 py-0.5 rounded-xs flex items-center gap-1 z-20 pointer-events-none select-none backdrop-blur-xs"
          title={headInfo.label}
        >
          <span>{headInfo.arrow}</span>
          <span>{t.preview.headAbbr}</span>
        </div>
      )}
    </div>
  );
};
