import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from '../utils/pdfSetup';
import { ImpositionSettings, ImposedSheet, PDFSourceInfo } from '../types';
import { getEffectiveSheetDimensions, isBackSideHorizontallyMirrored } from '../utils/imposition';
import { useI18n } from '../i18n/I18nContext';
import { Eye, Sun } from 'lucide-react';
import { PreviewToolbar } from './preview/PreviewToolbar';
import { LightTableOverlay } from './preview/LightTableOverlay';
import { CropMarks } from './preview/CropMarks';
import { SeamGuides } from './preview/SeamGuides';
import { SheetCell } from './preview/SheetCell';
import { ExcludedPagesTray } from './preview/ExcludedPagesTray';
import { OrientationGuide } from './preview/OrientationGuide';
import { computeBookletSeamLines, resolveMargins } from './preview/previewGeometry';

interface ImpositionPreviewProps {
  settings: ImpositionSettings;
  onChangeSettings?: (settings: ImpositionSettings) => void;
  plan: ImposedSheet[];
  sourcePDFInfo: PDFSourceInfo | null;
  pdfDocProxy: pdfjs.PDFDocumentProxy | null;
}

export const ImpositionPreview: React.FC<ImpositionPreviewProps> = ({
  settings,
  onChangeSettings,
  plan,
  sourcePDFInfo,
  pdfDocProxy,
}) => {
  const { t } = useI18n();
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [showLightTable, setShowLightTable] = useState(false);
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
      setCurrentSheetIdx(0);
    }
  }, [sourcePDFInfo?.name]);

  // Keep sheet index within bounds
  useEffect(() => {
    if (currentSheetIdx >= plan.length) {
      setCurrentSheetIdx(Math.max(0, plan.length - 1));
    }
  }, [plan, currentSheetIdx]);

  useEffect(() => {
    setSheetInput(String(currentSheetIdx + 1));
  }, [currentSheetIdx]);

  const activeSheet = plan[currentSheetIdx];

  // Find paired counterpart for double-sided sheet (Tiro / Retiro)
  const pairedSheet = useMemo(() => {
    if (!activeSheet) return null;
    if (activeSheet.side === 'front') {
      if (currentSheetIdx + 1 < plan.length && plan[currentSheetIdx + 1].sheetNumber === activeSheet.sheetNumber) {
        return plan[currentSheetIdx + 1];
      }
    } else if (activeSheet.side === 'back') {
      if (currentSheetIdx - 1 >= 0 && plan[currentSheetIdx - 1].sheetNumber === activeSheet.sheetNumber) {
        return plan[currentSheetIdx - 1];
      }
    }
    return null;
  }, [plan, currentSheetIdx, activeSheet]);

  const { width: sheetW, height: sheetH } = getEffectiveSheetDimensions(settings);

  // The back face is mirrored on the same physical turn axis the planner uses
  // (isBackSideHorizontallyMirrored), which depends on the sheet orientation,
  // not only on the duplex mode.
  const mirrorBack = isBackSideHorizontallyMirrored(settings);
  const activeMargins = resolveMargins(settings, activeSheet?.side, mirrorBack);
  const pairedMargins = resolveMargins(settings, pairedSheet?.side, mirrorBack);

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

  const nextSheet = () => {
    if (currentSheetIdx < plan.length - 1) {
      setCurrentSheetIdx(currentSheetIdx + 1);
    }
  };

  const prevSheet = () => {
    if (currentSheetIdx > 0) {
      setCurrentSheetIdx(currentSheetIdx - 1);
    }
  };

  const commitSheetChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val)) {
      setSheetInput(String(currentSheetIdx + 1));
      return;
    }
    const clamped = Math.max(1, Math.min(plan.length, val));
    setCurrentSheetIdx(clamped - 1);
    setSheetInput(String(clamped));
  };

  const handleSheetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setSheetInput(raw);
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val >= 1 && val <= plan.length) {
      setCurrentSheetIdx(val - 1);
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

  // Flip between Anverso and Reverso of the current physical sheet
  const toggleFlipSide = () => {
    if (!activeSheet) return;
    if (activeSheet.side === 'front') {
      if (currentSheetIdx + 1 < plan.length && plan[currentSheetIdx + 1].sheetNumber === activeSheet.sheetNumber) {
        setCurrentSheetIdx(currentSheetIdx + 1);
      }
    } else if (activeSheet.side === 'back') {
      if (currentSheetIdx - 1 >= 0 && plan[currentSheetIdx - 1].sheetNumber === activeSheet.sheetNumber) {
        setCurrentSheetIdx(currentSheetIdx - 1);
      }
    }
  };

  if (!sourcePDFInfo || plan.length === 0) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-neutral-50 border border-dashed border-neutral-200 rounded-xl p-8 text-center text-neutral-400 select-none">
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
        hasFlipPair={Boolean(pairedSheet)}
        showLightTable={showLightTable}
        sheetW={sheetW}
        sheetH={sheetH}
        sheetPreset={settings.sheetPreset}
        onToggleFlip={toggleFlipSide}
        onToggleLightTable={() => setShowLightTable(!showLightTable)}
        onPrev={prevSheet}
        onNext={nextSheet}
        onSheetInputChange={handleSheetInputChange}
        onSheetInputCommit={() => commitSheetChange(sheetInput)}
        onSheetInputKeyDown={handleSheetInputKeyDown}
      />

      {/* Main Responsive Paper Sheet Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-auto min-h-[340px] py-2">
        <div className="w-full max-w-[720px] relative">

          {/* Physical Sheet Container */}
          <div
            id="prepress-sheet"
            className={`w-full bg-white border border-neutral-300 relative origin-center transition-all duration-300 ${
              showLightTable && pairedSheet
                ? 'ring-2 ring-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.25)]'
                : 'shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
            }`}
            style={{
              aspectRatio: `${sheetW} / ${sheetH}`,
            }}
          >
            {/* Light Table Active Badge Indicator */}
            {showLightTable && pairedSheet && (
              <div className="absolute top-2 right-2 bg-amber-900/90 text-amber-100 text-[10px] font-mono px-2 py-0.5 rounded-xs shadow-md backdrop-blur-xs flex items-center gap-1.5 z-40 pointer-events-none select-none border border-amber-600/40">
                <Sun className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span>{t.preview.lightTableActive.replace('{side}', pairedSheet.side === 'front' ? t.preview.inkFront : t.preview.inkBack)}</span>
              </div>
            )}

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

            {/* Modo Trasluz / Light Table Overlay Layer */}
            {showLightTable && pairedSheet && (
              <LightTableOverlay
                pairedSheet={pairedSheet}
                pdfDocProxy={pdfDocProxy}
                settings={settings}
                sheetW={sheetW}
                sheetH={sheetH}
                mirrorBack={mirrorBack}
                pairedMargins={pairedMargins}
              />
            )}

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

      {/* LISTA DE PÁGINAS DESACTIVADAS CON SCROLL */}
      <ExcludedPagesTray
        pageIndices={settings.excludedPageIndices}
        pdfDocProxy={pdfDocProxy}
        settings={settings}
        onToggle={handleToggleExclude}
        onRestoreAll={onChangeSettings ? () => onChangeSettings({ ...settings, excludedPageIndices: [] }) : undefined}
      />

      {/* Info & Orientation Guide */}
      <OrientationGuide />
    </div>
  );
};
