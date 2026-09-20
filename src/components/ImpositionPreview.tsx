import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from '../utils/pdfSetup';
import { ImpositionSettings, ImposedSheet, PDFSourceInfo } from '../types';
import { getEffectiveSheetDimensions, isBackSideHorizontallyMirrored } from '../utils/imposition';
import { useI18n } from '../i18n/I18nContext';
import { Eye } from 'lucide-react';
import { PreviewToolbar } from './preview/PreviewToolbar';
import { CropMarks } from './preview/CropMarks';
import { SeamGuides } from './preview/SeamGuides';
import { SheetCell } from './preview/SheetCell';
import { ExcludedPagesPanel } from './preview/ExcludedPagesPanel';
import { computeBookletSeamLines, resolveMargins } from './preview/previewGeometry';
import { useElementSize } from '../hooks/useElementSize';

interface ImpositionPreviewProps {
  settings: ImpositionSettings;
  onChangeSettings?: (settings: ImpositionSettings) => void;
  plan: ImposedSheet[];
  sourcePDFInfo: PDFSourceInfo | null;
  pdfDocProxy: pdfjs.PDFDocumentProxy | null;
  currentSheetIdx: number;
  onChangeSheetIdx: (idx: number) => void;
}

export const ImpositionPreview: React.FC<ImpositionPreviewProps> = ({
  settings,
  onChangeSettings,
  plan,
  sourcePDFInfo,
  pdfDocProxy,
  currentSheetIdx,
  onChangeSheetIdx,
}) => {
  const { t } = useI18n();
  const [showExcludedPanel, setShowExcludedPanel] = useState(true);
  const [sheetInput, setSheetInput] = useState<string>('1');

  const handleToggleExclude = (sourceIdx: number) => {
    if (!onChangeSettings) return;
    const current = settings.excludedPageIndices || [];
    if (current.includes(sourceIdx)) {
      onChangeSettings({
        ...settings,
        excludedPageIndices: current.filter((idx) => idx !== sourceIdx),
      });
    } else {
      onChangeSettings({
        ...settings,
        excludedPageIndices: [...current, sourceIdx],
      });
    }
  };

  // Reset sheet index to 0 when loading a different document
  const lastDocNameRef = useRef<string | null>(null);
  useEffect(() => {
    if (sourcePDFInfo?.name && sourcePDFInfo.name !== lastDocNameRef.current) {
      lastDocNameRef.current = sourcePDFInfo.name;
      onChangeSheetIdx(0);
    }
  }, [sourcePDFInfo?.name]);

  // Keep sheet index within bounds
  useEffect(() => {
    if (currentSheetIdx >= plan.length) {
      onChangeSheetIdx(Math.max(0, plan.length - 1));
    }
  }, [plan, currentSheetIdx]);

  useEffect(() => {
    setSheetInput(String(currentSheetIdx + 1));
  }, [currentSheetIdx]);

  const activeSheet = plan[currentSheetIdx];

  const { width: sheetW, height: sheetH } = getEffectiveSheetDimensions(settings);

  // The back face is mirrored on the same physical turn axis the planner uses
  // (isBackSideHorizontallyMirrored), which depends on the sheet orientation,
  // not only on the duplex mode.
  const mirrorBack = isBackSideHorizontallyMirrored(settings);
  const activeMargins = resolveMargins(settings, activeSheet?.side, mirrorBack);

  const marginLPercent = (activeMargins.l / sheetW) * 100;
  const marginRPercent = (activeMargins.r / sheetW) * 100;
  const marginTPercent = (activeMargins.t / sheetH) * 100;
  const marginBPercent = (activeMargins.b / sheetH) * 100;

  // Calculate mathematically exact fold and cut lines derived from actual cell coordinates
  const bookletSeamLines = useMemo(
    () =>
      computeBookletSeamLines(activeSheet, settings, sheetW, sheetH, {
        spineFold: t.preview.spineFold,
        guillotineCut: t.preview.guillotineCut,
        crossFold: t.preview.crossFold,
      }),
    [settings.layoutMode, settings.booklet4UpMode, activeSheet, sheetW, sheetH, t.preview.spineFold, t.preview.guillotineCut, t.preview.crossFold]
  );

  // Size the sheet to fit the available canvas (contain, no scrolling).
  const { ref: canvasBoxRef, size: canvasSize } = useElementSize<HTMLDivElement>();
  const fitScale =
    canvasSize.width > 0 && canvasSize.height > 0
      ? Math.min(canvasSize.width / sheetW, canvasSize.height / sheetH)
      : 0;
  const sheetDisplayW = fitScale > 0 ? Math.floor(sheetW * fitScale) : 720;
  const sheetDisplayH =
    fitScale > 0 ? Math.floor(sheetH * fitScale) : Math.floor((720 * sheetH) / sheetW);

  const nextSheet = () => {
    if (currentSheetIdx < plan.length - 1) {
      onChangeSheetIdx(currentSheetIdx + 1);
    }
  };

  const prevSheet = () => {
    if (currentSheetIdx > 0) {
      onChangeSheetIdx(currentSheetIdx - 1);
    }
  };

  const commitSheetChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val)) {
      setSheetInput(String(currentSheetIdx + 1));
      return;
    }
    const clamped = Math.max(1, Math.min(plan.length, val));
    onChangeSheetIdx(clamped - 1);
    setSheetInput(String(clamped));
  };

  const handleSheetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setSheetInput(raw);
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val >= 1 && val <= plan.length) {
      onChangeSheetIdx(val - 1);
    }
  };

  const handleSheetInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitSheetChange(sheetInput);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextSheet();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      prevSheet();
    }
  };

  if (!sourcePDFInfo || plan.length === 0) {
    return (
      <div className="h-full min-h-100 flex flex-col items-center justify-center bg-neutral-50 border border-dashed border-neutral-200 rounded-xl p-8 text-center text-neutral-400 select-none">
        <Eye className="w-12 h-12 stroke-[1.25] text-neutral-300 mb-3" />
        <p className="text-sm font-medium text-neutral-600 mb-1">{t.preview.emptyTitle}</p>
        <p className="text-xs max-w-sm text-neutral-400">
          {t.preview.emptyDesc}
        </p>
      </div>
    );
  }

  if (!activeSheet) return null;

  return (
    <div className="flex flex-col h-full bg-neutral-50/60 p-5 rounded-xl border border-neutral-200">
      {/* Header controls for Sheet View */}
      <PreviewToolbar
        activeSheet={activeSheet}
        currentSheetIdx={currentSheetIdx}
        planLength={plan.length}
        sheetInput={sheetInput}
        excludedCount={settings.excludedPageIndices?.length ?? 0}
        onToggleExcluded={() => setShowExcludedPanel((v) => !v)}
        onPrev={prevSheet}
        onNext={nextSheet}
        onSheetInputChange={handleSheetInputChange}
        onSheetInputCommit={() => commitSheetChange(sheetInput)}
        onSheetInputKeyDown={handleSheetInputKeyDown}
      />

      {/* Main Paper Sheet Canvas + optional disabled-pages side panel */}
      <div className="flex-1 min-h-0 flex gap-3">
      <div ref={canvasBoxRef} className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <div className="relative" style={{ width: sheetDisplayW, height: sheetDisplayH }}>

          {/* Physical Sheet Container */}
          <div
            id="prepress-sheet"
            className="w-full h-full bg-white border border-neutral-300 relative shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
          >
            {/* Sheet Margin bounds */}
            <div
              className="absolute border border-dashed border-neutral-300/80 pointer-events-none"
              style={{
                left: `${marginLPercent}%`,
                right: `${marginRPercent}%`,
                top: `${marginTPercent}%`,
                bottom: `${marginBPercent}%`,
              }}
            />

            {/* Imposition Cells */}
            {activeSheet.cells.map((cell, idx) => (
              <SheetCell
                key={`${currentSheetIdx}-cell-${idx}`}
                cell={cell}
                pdfDocProxy={pdfDocProxy}
                settings={settings}
                sheetW={sheetW}
                sheetH={sheetH}
                interactive={Boolean(onChangeSettings)}
                onToggleExclude={handleToggleExclude}
              />
            ))}

            {/* Crop Marks (Marcas de Corte) */}
            <CropMarks
              activeSheet={activeSheet}
              settings={settings}
              sheetW={sheetW}
              sheetH={sheetH}
            />

            {/* Booklet Spine / Fold & Cut Guides */}
            {settings.layoutMode === 'booklet' && (
              <SeamGuides
                verticalLines={bookletSeamLines.verticalLines}
                horizontalLines={bookletSeamLines.horizontalLines}
              />
            )}

          </div>
        </div>
      </div>

        {showExcludedPanel && (
          <ExcludedPagesPanel
            pageIndices={settings.excludedPageIndices}
            pdfDocProxy={pdfDocProxy}
            settings={settings}
            onToggle={handleToggleExclude}
            onRestoreAll={onChangeSettings ? () => onChangeSettings({ ...settings, excludedPageIndices: [] }) : undefined}
            onClose={() => setShowExcludedPanel(false)}
          />
        )}
      </div>
    </div>
  );
};
