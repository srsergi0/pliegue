import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from '../utils/pdfSetup';
import { ImpositionSettings, ImposedSheet, PDFSourceInfo, PagePart } from '../types';
import { getEffectiveSheetDimensions, isBackSideHorizontallyMirrored } from '../utils/imposition';
import { useI18n } from '../i18n/I18nContext';
import { Eye, ChevronLeft, ChevronRight, RefreshCw, Info, ArrowRightLeft, Scissors, Sun, EyeOff, RotateCcw, FileText } from 'lucide-react';

interface PDFPageThumbnailProps {
  pdfDocument: pdfjs.PDFDocumentProxy;
  pageIndex: number;
  pagePart?: PagePart;
  rotation: 0 | 90 | 180 | 270;
  cellWidthMm: number;
  cellHeightMm: number;
  settings: ImpositionSettings;
}

/**
 * Rotates a canvas clockwise by 0, 90, 180 or 270 degrees.
 */
function rotateCanvasClockwise(source: HTMLCanvasElement, angle: number): HTMLCanvasElement {
  const a = ((angle % 360) + 360) % 360;
  const sw = source.width;
  const sh = source.height;
  const output = document.createElement('canvas');
  if (a === 90 || a === 270) {
    output.width = sh;
    output.height = sw;
  } else {
    output.width = sw;
    output.height = sh;
  }
  const ctx = output.getContext('2d');
  if (!ctx) return source;
  if (a === 90) {
    ctx.translate(sh, 0);
    ctx.rotate(Math.PI / 2);
  } else if (a === 180) {
    ctx.translate(sw, sh);
    ctx.rotate(Math.PI);
  } else if (a === 270) {
    ctx.translate(0, sw);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(source, 0, 0);
  return output;
}

/**
 * Renders a PDF page exactly as the exported PDF places it: the split crop is
 * taken in the raw (unrotated) page space using the page `/Rotate` metadata,
 * then the fragment is rotated by the cell rotation, and the final box is sized
 * with the same scale rules as pdfGenerator. This keeps the preview WYSIWYG.
 */
const PDFPageThumbnail: React.FC<PDFPageThumbnailProps> = ({
  pdfDocument,
  pageIndex,
  pagePart = 'full',
  rotation,
  cellWidthMm,
  cellHeightMm,
  settings,
}) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [placement, setPlacement] = useState<{ w: number; h: number } | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    async function renderPage() {
      if (!canvasRef.current || !pdfDocument) return;

      setLoading(true);
      setError(false);

      try {
        // pdfjs uses 1-based index
        const page = await pdfDocument.getPage(pageIndex + 1);
        if (!active) return;

        const MM_TO_PT = 72 / 25.4;

        // Raw (unrotated) page size in points, matching pdf-lib getWidth/getHeight.
        const rawViewport = page.getViewport({ scale: 1.0, rotation: 0 });
        const rawWPt = rawViewport.width;
        const rawHPt = rawViewport.height;

        const origAngle = ((page.rotate % 360) + 360) % 360;
        const isSplit = pagePart === 'left_half' || pagePart === 'right_half';

        // Crop box in raw PDF points (bottom-left origin), identical to pdfGenerator.
        let boxLeft = 0;
        let boxBottom = 0;
        let boxRight = rawWPt;
        let boxTop = rawHPt;
        if (isSplit) {
          if (origAngle === 0) {
            if (pagePart === 'left_half') boxRight = rawWPt / 2;
            else boxLeft = rawWPt / 2;
          } else if (origAngle === 90) {
            if (pagePart === 'left_half') boxBottom = rawHPt / 2;
            else boxTop = rawHPt / 2;
          } else if (origAngle === 180) {
            if (pagePart === 'left_half') boxLeft = rawWPt / 2;
            else boxRight = rawWPt / 2;
          } else if (origAngle === 270) {
            if (pagePart === 'left_half') boxTop = rawHPt / 2;
            else boxBottom = rawHPt / 2;
          }
        }
        const boxWPt = boxRight - boxLeft;
        const boxHPt = boxTop - boxBottom;

        // Total clockwise turn applied by pdfGenerator (cell rotation + page /Rotate).
        const totalClockwise = (((rotation + origAngle) % 360) + 360) % 360;
        const isRotSwapped = totalClockwise === 90 || totalClockwise === 270;

        // Visual size of the fragment as drawn in the exported PDF.
        const finalVisualWMm = (isRotSwapped ? boxHPt : boxWPt) / MM_TO_PT;
        const finalVisualHMm = (isRotSwapped ? boxWPt : boxHPt) / MM_TO_PT;

        // Same scale rules as pdfGenerator.
        let scale = 1;
        if (settings.scaleMode === 'fit') {
          scale = Math.min(cellWidthMm / finalVisualWMm, cellHeightMm / finalVisualHMm);
        } else if (settings.scaleMode === 'fill') {
          scale = Math.max(cellWidthMm / finalVisualWMm, cellHeightMm / finalVisualHMm);
        } else if (settings.scaleMode === 'custom') {
          scale = settings.customScale / 100;
        }
        const placedWMm = finalVisualWMm * scale;
        const placedHMm = finalVisualHMm * scale;

        // Render the raw page, crop the fragment and rotate it exactly like the PDF.
        const renderScale = Math.max(0.75, Math.min(4, 1100 / Math.max(boxWPt, boxHPt)));
        const fullViewport = page.getViewport({ scale: renderScale, rotation: 0 });
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = Math.max(1, Math.ceil(fullViewport.width));
        fullCanvas.height = Math.max(1, Math.ceil(fullViewport.height));
        const fullCtx = fullCanvas.getContext('2d');
        if (!fullCtx) return;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
        const renderTask = page.render({ canvasContext: fullCtx, viewport: fullViewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!active) return;

        // PDF coordinates are bottom-left based; the canvas is top-left based.
        const pxLeft = Math.round(boxLeft * renderScale);
        const pxTop = Math.round((rawHPt - boxTop) * renderScale);
        const pxW = Math.max(1, Math.round(boxWPt * renderScale));
        const pxH = Math.max(1, Math.round(boxHPt * renderScale));

        const fragCanvas = document.createElement('canvas');
        fragCanvas.width = pxW;
        fragCanvas.height = pxH;
        const fragCtx = fragCanvas.getContext('2d');
        if (!fragCtx) return;
        fragCtx.drawImage(fullCanvas, pxLeft, pxTop, pxW, pxH, 0, 0, pxW, pxH);

        const rotated = rotateCanvasClockwise(fragCanvas, totalClockwise);

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = rotated.width;
        canvas.height = rotated.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(rotated, 0, 0);

        if (active) {
          setPlacement({
            w: (placedWMm / cellWidthMm) * 100,
            h: (placedHMm / cellHeightMm) * 100,
          });
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException' && active) {
          console.error('Error rendering page:', err);
          setError(true);
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDocument, pageIndex, pagePart, rotation, cellWidthMm, cellHeightMm, settings]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white select-none">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-50/80 z-10">
          <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
        </div>
      )}
      {error ? (
        <div className="text-xs text-red-500 text-center p-2">{t.preview.renderError}</div>
      ) : (
        <canvas
          ref={canvasRef}
          className="block bg-white shadow-2xs"
          style={
            placement
              ? { width: `${placement.w}%`, height: `${placement.h}%` }
              : { visibility: 'hidden' }
          }
        />
      )}
    </div>
  );
};

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

  const activeSheet = plan[currentSheetIdx];
  if (!activeSheet) return null;

  const { width: sheetW, height: sheetH } = getEffectiveSheetDimensions(settings);

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

  const hasFlipPair = Boolean(pairedSheet);

  // Margins in percentage for the visual guide. The back face is mirrored on
  // the same physical turn axis the planner uses (isBackSideHorizontallyMirrored),
  // which depends on the sheet orientation, not only on the duplex mode.
  const mirrorBack = isBackSideHorizontallyMirrored(settings);
  const resolveMargins = (side: 'front' | 'back' | 'single' | undefined) => {
    if (side !== 'back') {
      return { l: settings.marginLeft, r: settings.marginRight, t: settings.marginTop, b: settings.marginBottom };
    }
    return mirrorBack
      ? { l: settings.marginRight, r: settings.marginLeft, t: settings.marginTop, b: settings.marginBottom }
      : { l: settings.marginLeft, r: settings.marginRight, t: settings.marginBottom, b: settings.marginTop };
  };

  const activeMargins = resolveMargins(activeSheet.side);
  const marginLPercent = (activeMargins.l / sheetW) * 100;
  const marginRPercent = (activeMargins.r / sheetW) * 100;
  const marginTPercent = (activeMargins.t / sheetH) * 100;
  const marginBPercent = (activeMargins.b / sheetH) * 100;

  // Paired sheet margins for Light Table overlay
  const pairedMargins = resolveMargins(pairedSheet?.side);
  const pairedMarginLPercent = (pairedMargins.l / sheetW) * 100;
  const pairedMarginRPercent = (pairedMargins.r / sheetW) * 100;
  const pairedMarginTPercent = (pairedMargins.t / sheetH) * 100;
  const pairedMarginBPercent = (pairedMargins.b / sheetH) * 100;

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

  const [sheetInput, setSheetInput] = useState<string>(String(currentSheetIdx + 1));

  useEffect(() => {
    setSheetInput(String(currentSheetIdx + 1));
  }, [currentSheetIdx]);

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

  // Helper to get visual head label and arrow depending on cell rotation
  const getHeadIndicator = (angle: number) => {
    if (angle === 0) return { arrow: '▲', label: t.preview.headUp };
    if (angle === 90) return { arrow: '►', label: t.preview.headRight };
    if (angle === 180) return { arrow: '▼', label: t.preview.headDown };
    return { arrow: '◄', label: t.preview.headLeft };
  };

  // Renders the orientation guide with highlighted keywords ({flip} / {light})
  const renderOrientationDesc = () => {
    const parts = t.preview.orientationDesc.split(/(\{flip\}|\{light\})/g);
    return parts.map((part, i) => {
      if (part === '{flip}') {
        return <strong key={i} className="text-neutral-700 font-semibold">{t.preview.flipWord}</strong>;
      }
      if (part === '{light}') {
        return <strong key={i} className="text-amber-800 font-semibold">{t.preview.lightWord}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Helper to build page badges (Pág. N, halves, courtesy / blank)
  const pageLabelFor = (
    sourcePageIndex: number | null,
    pagePart: PagePart | undefined,
    isSpacerBlank: boolean | undefined
  ) => {
    let label = sourcePageIndex !== null
      ? `${t.preview.pageAbbr} ${sourcePageIndex + 1}`
      : isSpacerBlank ? t.preview.courtesy : t.preview.blank;
    if (pagePart === 'left_half') {
      label += t.preview.leftHalf;
    } else if (pagePart === 'right_half') {
      label += t.preview.rightHalf;
    }
    return label;
  };

  const courtesyLabelFor = (spacerReason: string | undefined) => {
    if (spacerReason === 'spread_alignment_start') return t.preview.courtesyAlign;
    if (spacerReason === 'front_cover_inside') return t.preview.courtesyFrontCover;
    if (spacerReason === 'back_cover_inside') return t.preview.courtesyBackCover;
    if (spacerReason === 'signature_padding') return t.preview.courtesyPadding;
    return t.preview.courtesyDefault;
  };

  // Calculate mathematically exact fold and cut lines derived from actual cell coordinates
  const bookletSeamLines = useMemo(() => {
    if (settings.layoutMode !== 'booklet' || !activeSheet || activeSheet.cells.length === 0) {
      return { verticalLines: [], horizontalLines: [] };
    }

    const verticalLines: { xPct: number; isFold: boolean; label: string }[] = [];
    const horizontalLines: { yPct: number; isFold: boolean; label: string }[] = [];

    // Unique X coordinates of columns (sorted left to right)
    const xPositions: number[] = Array.from(new Set<number>(activeSheet.cells.map(c => Math.round(c.x * 100) / 100))).sort((a, b) => a - b);
    for (let c = 0; c < xPositions.length - 1; c++) {
      const colLeft = activeSheet.cells.find(cell => Math.abs(cell.x - xPositions[c]) < 0.1);
      const colRight = activeSheet.cells.find(cell => Math.abs(cell.x - xPositions[c + 1]) < 0.1);

      if (colLeft && colRight) {
        const seamX = (colLeft.x + colLeft.width + colRight.x) / 2;
        const xPct = (seamX / sheetW) * 100;
        // In booklet mode:
        // Even boundary (0, 2) is the fold line between left and right pages of a spread
        // Odd boundary (1, 3) is the cut line between adjacent spreads
        const isFold = (c % 2 === 0);
        verticalLines.push({
          xPct,
          isFold,
          label: isFold ? t.preview.spineFold : t.preview.guillotineCut,
        });
      }
    }

    // Unique Y coordinates of rows (sorted top to bottom)
    const yPositions: number[] = Array.from(new Set<number>(activeSheet.cells.map(c => Math.round(c.y * 100) / 100))).sort((a, b) => a - b);
    for (let r = 0; r < yPositions.length - 1; r++) {
      const rowTop = activeSheet.cells.find(cell => Math.abs(cell.y - yPositions[r]) < 0.1);
      const rowBottom = activeSheet.cells.find(cell => Math.abs(cell.y - yPositions[r + 1]) < 0.1);

      if (rowTop && rowBottom) {
        const seamY = (rowTop.y + rowTop.height + rowBottom.y) / 2;
        const yPct = (seamY / sheetH) * 100;
        const isFrenchFold = settings.booklet4UpMode === 'french_fold';
        horizontalLines.push({
          yPct,
          isFold: isFrenchFold,
          label: isFrenchFold ? t.preview.crossFold : t.preview.guillotineCut,
        });
      }
    }

    return { verticalLines, horizontalLines };
  }, [settings.layoutMode, settings.booklet4UpMode, activeSheet, sheetW, sheetH, t.preview.spineFold, t.preview.guillotineCut, t.preview.crossFold]);

  return (
    <div className="flex flex-col h-full bg-neutral-50/60 p-5 rounded-xl border border-neutral-200">
      {/* Header controls for Sheet View */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                {activeSheet.label}
              </h3>
              {activeSheet.side === 'front' && (
                <span className="text-[10px] bg-neutral-900 text-white font-mono px-1.5 py-0.5 rounded-sm">
                  {t.preview.front}
                </span>
              )}
              {activeSheet.side === 'back' && (
                <span className="text-[10px] bg-amber-700 text-white font-mono px-1.5 py-0.5 rounded-sm">
                  {t.preview.back}
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
              {t.preview.sheetOf} {currentSheetIdx + 1} {t.preview.totalSheets} {plan.length} • {t.preview.sheetWord} {settings.sheetPreset} ({sheetW} × {sheetH} mm) • {activeSheet.cells.length} {t.preview.cellsWord} ({activeSheet.cells[0] ? `${activeSheet.cells[0].width.toFixed(1)} × ${activeSheet.cells[0].height.toFixed(1)} mm` : ''})
            </p>
          </div>
        </div>

        {/* Quick Side Flip, Light Table & Navigation buttons */}
        <div className="flex items-center gap-2 select-none">
          {hasFlipPair && (
            <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs gap-0.5">
              <button
                onClick={toggleFlipSide}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 px-2.5 py-1.5 rounded-md transition-colors"
                title={activeSheet.side === 'front' ? t.preview.flipTitleToBack : t.preview.flipTitleToFront}
                id="btn-toggle-flip"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t.preview.flipTo} <strong className="font-semibold text-neutral-900">{activeSheet.side === 'front' ? t.preview.backShort : t.preview.frontShort}</strong></span>
              </button>

              <div className="w-[1px] h-4 bg-neutral-200 mx-0.5" />

              <button
                onClick={() => setShowLightTable(!showLightTable)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all ${
                  showLightTable
                    ? 'bg-amber-100 text-amber-950 border border-amber-300 font-semibold shadow-2xs'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
                title={t.preview.lightTableTooltip}
                id="btn-toggle-light-table"
              >
                <Sun className={`w-3.5 h-3.5 ${showLightTable ? 'text-amber-600 animate-pulse' : 'text-neutral-500'}`} />
                <span>{t.preview.lightTable}</span>
                {showLightTable && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            </div>
          )}

          <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={prevSheet}
              disabled={currentSheetIdx === 0}
              className="p-1 rounded-md hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-neutral-600"
              title={t.preview.prevSheet}
              id="btn-prev-sheet"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1 px-1 select-none">
              <input
                type="number"
                min={1}
                max={plan.length}
                value={sheetInput}
                onChange={handleSheetInputChange}
                onBlur={() => commitSheetChange(sheetInput)}
                onKeyDown={handleSheetInputKeyDown}
                className="w-11 h-6 text-center text-xs font-mono font-bold text-neutral-900 bg-neutral-100/90 hover:bg-neutral-200/60 focus:bg-white border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded px-0.5 outline-hidden transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                title={t.preview.sheetInputTitle}
                id="input-sheet-number"
                aria-label={t.preview.sheetInputAria}
              />
              <span className="text-xs font-mono font-medium text-neutral-400">
                / {plan.length}
              </span>
            </div>

            <button
              onClick={nextSheet}
              disabled={currentSheetIdx === plan.length - 1}
              className="p-1 rounded-md hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-neutral-600"
              title={t.preview.nextSheet}
              id="btn-next-sheet"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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
                  const pPageLabel = pageLabelFor(pCell.sourcePageIndex, pCell.pagePart, pCell.isSpacerBlank);

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
                          <PDFPageThumbnail
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
            )}

            {/* Imposition Cells */}
            {activeSheet.cells.map((cell, idx) => {
              const cellLeft = (cell.x / sheetW) * 100;
              const cellTop = (cell.y / sheetH) * 100;
              const cellWPercent = (cell.width / sheetW) * 100;
              const cellHPercent = (cell.height / sheetH) * 100;

              const hasPage = cell.sourcePageIndex !== null;
              const pageLabel = pageLabelFor(cell.sourcePageIndex, cell.pagePart, cell.isSpacerBlank);
              const headInfo = getHeadIndicator(cell.rotation);

              return (
                <div
                  key={`${currentSheetIdx}-cell-${idx}`}
                  onClick={() => {
                    if (hasPage && onChangeSettings) {
                      handleToggleExclude(cell.sourcePageIndex!);
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
                  {hasPage && onChangeSettings && (
                    <div className="absolute top-1 right-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="flex items-center gap-1 bg-rose-600 text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow-xs">
                        <EyeOff className="w-2.5 h-2.5" />
                        <span>{t.preview.deactivate}</span>
                      </span>
                    </div>
                  )}

                  {/* Actual Page Rendering */}
                  {hasPage && pdfDocProxy ? (
                    <PDFPageThumbnail
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
                            {courtesyLabelFor(cell.spacerReason)}
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
            })}

            {/* Crop Marks (Marcas de Corte) — geometry mirrors pdfGenerator:
                offset outside the trim by `bleed`, length `cropMarkLength` (mm). */}
            {settings.drawCropMarks && (
              <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                {activeSheet.cells.map((cell, idx) => {
                  const cellLeft = (cell.x / sheetW) * 100;
                  const cellTop = (cell.y / sheetH) * 100;
                  const cellRight = ((cell.x + cell.width) / sheetW) * 100;
                  const cellBottom = ((cell.y + cell.height) / sheetH) * 100;

                  const bleedX = (settings.bleed / sheetW) * 100;
                  const bleedY = (settings.bleed / sheetH) * 100;
                  const lenX = (settings.cropMarkLength / sheetW) * 100;
                  const lenY = (settings.cropMarkLength / sheetH) * 100;
                  const hMark = 'absolute bg-neutral-800';
                  const vMark = 'absolute bg-neutral-800';

                  return (
                    <div key={`crop-marks-${idx}`} className="absolute inset-0">
                      {/* Top-Left */}
                      <div className={vMark} style={{ left: `${cellLeft - bleedX}%`, top: `${cellTop - bleedY - lenY}%`, width: '1px', height: `${lenY}%` }} />
                      <div className={hMark} style={{ left: `${cellLeft - bleedX - lenX}%`, top: `${cellTop - bleedY}%`, width: `${lenX}%`, height: '1px' }} />

                      {/* Top-Right */}
                      <div className={vMark} style={{ left: `${cellRight + bleedX}%`, top: `${cellTop - bleedY - lenY}%`, width: '1px', height: `${lenY}%` }} />
                      <div className={hMark} style={{ left: `${cellRight + bleedX}%`, top: `${cellTop - bleedY}%`, width: `${lenX}%`, height: '1px' }} />

                      {/* Bottom-Left */}
                      <div className={vMark} style={{ left: `${cellLeft - bleedX}%`, top: `${cellBottom + bleedY}%`, width: '1px', height: `${lenY}%` }} />
                      <div className={hMark} style={{ left: `${cellLeft - bleedX - lenX}%`, top: `${cellBottom + bleedY}%`, width: `${lenX}%`, height: '1px' }} />

                      {/* Bottom-Right */}
                      <div className={vMark} style={{ left: `${cellRight + bleedX}%`, top: `${cellBottom + bleedY}%`, width: '1px', height: `${lenY}%` }} />
                      <div className={hMark} style={{ left: `${cellRight + bleedX}%`, top: `${cellBottom + bleedY}%`, width: `${lenX}%`, height: '1px' }} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Booklet Spine / Fold & Cut Guides */}
            {settings.layoutMode === 'booklet' && (
              <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                {/* Vertical seam lines */}
                {bookletSeamLines.verticalLines.map((vLine, idx) => (
                  <div
                    key={`v-seam-${idx}`}
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{ left: `${vLine.xPct}%` }}
                  >
                    {/* Exact centered hairline */}
                    <div
                      className={`absolute top-0 bottom-0 w-0 border-r-2 border-dashed -translate-x-[1px] ${
                        vLine.isFold ? 'border-indigo-600/90' : 'border-rose-600/90'
                      }`}
                    />
                    {/* Badge centered exactly on line */}
                    <div className="absolute top-2 left-0 -translate-x-1/2 flex items-center justify-center">
                      <span
                        className={`text-[8.5px] text-white px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 backdrop-blur-xs whitespace-nowrap select-none ${
                          vLine.isFold ? 'bg-indigo-600/95' : 'bg-rose-600/95'
                        }`}
                      >
                        {vLine.isFold ? (
                          <>
                            <span>📖</span>
                            <span>{vLine.label}</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="w-2.5 h-2.5" />
                            <span>{vLine.label}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Horizontal seam lines */}
                {bookletSeamLines.horizontalLines.map((hLine, idx) => (
                  <div
                    key={`h-seam-${idx}`}
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: `${hLine.yPct}%` }}
                  >
                    {/* Exact centered hairline */}
                    <div
                      className={`absolute left-0 right-0 h-0 border-b-2 border-dashed -translate-y-[1px] ${
                        hLine.isFold ? 'border-indigo-600/90' : 'border-rose-600/90'
                      }`}
                    />
                    {/* Badge centered exactly on line */}
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                      <span
                        className={`text-[8.5px] text-white px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 backdrop-blur-xs whitespace-nowrap select-none ${
                          hLine.isFold ? 'bg-indigo-600/95' : 'bg-rose-600/95'
                        }`}
                      >
                        {hLine.isFold ? (
                          <>
                            <span>✉️</span>
                            <span>{hLine.label}</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="w-3 h-3" />
                            <span>{hLine.label}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 2.5 LISTA DE PÁGINAS DESACTIVADAS CON SCROLL */}
      {settings.excludedPageIndices && settings.excludedPageIndices.length > 0 && (
        <div className="w-full max-w-[720px] bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 flex flex-col gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-neutral-900">
                  {t.preview.disabledPagesTitle} ({settings.excludedPageIndices.length})
                </span>
                <span className="text-[10px] text-neutral-500 hidden sm:inline">
                  • {t.preview.disabledPagesHint}
                </span>
              </div>
            </div>
            {settings.excludedPageIndices.length > 1 && onChangeSettings && (
              <button
                type="button"
                onClick={() => onChangeSettings({ ...settings, excludedPageIndices: [] })}
                className="text-[10px] font-semibold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded cursor-pointer transition-all shadow-2xs"
              >
                {t.preview.restoreAll}
              </button>
            )}
          </div>

          {/* Scrollable list with horizontal scroll */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {settings.excludedPageIndices
              .slice()
              .sort((a, b) => a - b)
              .map((pageIdx) => {
                return (
                  <div
                    key={`excluded-page-${pageIdx}`}
                    onClick={() => handleToggleExclude(pageIdx)}
                    title={t.preview.clickToEnableTooltip}
                    className="group relative flex flex-col items-center shrink-0 w-20 bg-white border border-neutral-200 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-200 rounded-lg p-1.5 shadow-2xs cursor-pointer transition-all select-none"
                  >
                    {/* Thumbnail preview */}
                    <div className="w-full aspect-[3/4] bg-neutral-100 rounded flex items-center justify-center overflow-hidden border border-neutral-100 relative">
                      {pdfDocProxy ? (
                        <div className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity">
                          <PDFPageThumbnail
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
      )}

      {/* Info & Orientation Guide */}
      <div className="mt-3 bg-white rounded-lg p-3 text-xs text-neutral-500 border border-neutral-200/80 flex gap-2 items-start select-none shadow-2xs">
        <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-semibold text-neutral-700 mb-0.5">
            {t.preview.orientationTitle.replace('{head}', t.preview.headAbbr)}
          </p>
          <p className="text-[11px] text-neutral-500">
            {renderOrientationDesc()}
          </p>
        </div>
      </div>
    </div>
  );
};
