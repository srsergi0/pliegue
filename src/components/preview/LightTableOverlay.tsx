import React from 'react';
import { pdfjs } from '../../utils/pdfSetup';
import { ImpositionSettings, ImposedSheet } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { PageThumbnail } from './PageThumbnail';
import { MarginBox, pageLabelFor } from './previewGeometry';

interface LightTableOverlayProps {
  pairedSheet: ImposedSheet;
  pdfDocProxy: pdfjs.PDFDocumentProxy | null;
  settings: ImpositionSettings;
  sheetW: number;
  sheetH: number;
  mirrorBack: boolean;
  pairedMargins: MarginBox;
}

/**
 * Translucent overlay of the paired (reverse) side as seen through the paper,
 * used to verify front-to-back registration like a prepress light table.
 */
export const LightTableOverlay: React.FC<LightTableOverlayProps> = ({
  pairedSheet,
  pdfDocProxy,
  settings,
  sheetW,
  sheetH,
  mirrorBack,
  pairedMargins,
}) => {
  const { t } = useI18n();

  const pairedMarginLPercent = (pairedMargins.l / sheetW) * 100;
  const pairedMarginRPercent = (pairedMargins.r / sheetW) * 100;
  const pairedMarginTPercent = (pairedMargins.t / sheetH) * 100;
  const pairedMarginBPercent = (pairedMargins.b / sheetH) * 100;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
      style={{
        transform: mirrorBack ? 'scaleX(-1)' : 'scaleY(-1)',
        transformOrigin: 'center center',
      }}
    >
      {/* Paired Sheet Margins in amber */}
      <div
        className="absolute border border-dashed border-amber-500/70 pointer-events-none"
        style={{
          left: `${pairedMarginLPercent}%`,
          right: `${pairedMarginRPercent}%`,
          top: `${pairedMarginTPercent}%`,
          bottom: `${pairedMarginBPercent}%`,
        }}
      />

      {/* Paired Sheet Cells (Reverse Side) */}
      {pairedSheet.cells.map((pCell, pIdx) => {
        const pCellLeft = (pCell.x / sheetW) * 100;
        const pCellTop = (pCell.y / sheetH) * 100;
        const pCellWPercent = (pCell.width / sheetW) * 100;
        const pCellHPercent = (pCell.height / sheetH) * 100;

        const pHasPage = pCell.sourcePageIndex !== null;
        const pPageLabel = pageLabelFor(t.preview, pCell.sourcePageIndex, pCell.pagePart, pCell.isSpacerBlank);

        return (
          <div
            key={`paired-cell-${pIdx}`}
            className="absolute border-2 border-dashed border-amber-500/80 bg-amber-500/[0.08] flex flex-col justify-between overflow-hidden"
            style={{
              left: `${pCellLeft}%`,
              top: `${pCellTop}%`,
              width: `${pCellWPercent}%`,
              height: `${pCellHPercent}%`,
            }}
          >
            {/* Translucent thumbnail of reverse side as seen through paper */}
            {pHasPage && pdfDocProxy && (
              <div className="w-full h-full opacity-35 mix-blend-multiply filter contrast-125">
                <PageThumbnail
                  pdfDocument={pdfDocProxy}
                  pageIndex={pCell.sourcePageIndex!}
                  pagePart={pCell.pagePart}
                  rotation={pCell.rotation}
                  cellWidthMm={pCell.width}
                  cellHeightMm={pCell.height}
                  settings={settings}
                />
              </div>
            )}

            {/* Legible counter-mirrored badge */}
            <div
              className="absolute bottom-1.5 left-1.5 bg-amber-900/90 text-amber-100 text-[8.5px] font-mono px-1.5 py-0.5 rounded-xs pointer-events-none z-30 flex items-center gap-1 shadow-sm backdrop-blur-xs select-none border border-amber-600/40"
              style={{
                transform: mirrorBack ? 'scaleX(-1)' : 'scaleY(-1)',
              }}
            >
              <span className="font-bold">
                {pairedSheet.side === 'front' ? t.preview.inkFront : t.preview.inkBack}: {pPageLabel}
              </span>
              {pHasPage && <span className="opacity-80">({pCell.rotation}°)</span>}
            </div>

            {/* Corner registration crosshairs */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-600/90 pointer-events-none" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-600/90 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-600/90 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-600/90 pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};
