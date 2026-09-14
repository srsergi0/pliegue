import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from '../utils/pdfSetup';
import { ImpositionSettings, ImposedSheet, PDFSourceInfo } from '../types';
import { getEffectiveSheetDimensions } from '../utils/imposition';
import { useI18n } from '../i18n/I18nContext';
import { Eye, ChevronLeft, ChevronRight, RefreshCw, Info, ArrowRightLeft, Scissors, Sun } from 'lucide-react';

interface PDFPageThumbnailProps {
  pdfDocument: pdfjs.PDFDocumentProxy;
  pageIndex: number;
  rotation: 0 | 90 | 180 | 270;
  cellWidthMm: number;
  cellHeightMm: number;
  settings: ImpositionSettings;
}

/**
 * Renders an actual PDF page to a high-resolution Canvas,
 * correctly scaled, centered and rotated natively by PDF.js.
 */
const PDFPageThumbnail: React.FC<PDFPageThumbnailProps> = ({
  pdfDocument,
  pageIndex,
  rotation,
  cellWidthMm,
  cellHeightMm,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // In PDF.js, page.rotate is the page's natural rotation metadata.
        // We pass the final combined clockwise angle directly to getViewport.
        const totalClockwiseAngle = (page.rotate + rotation) % 360;

        // Viewport at scale 1.0 to get rotated dimensions in points
        const testViewport = page.getViewport({ scale: 1.0, rotation: totalClockwiseAngle });
        const rotWMm = (testViewport.width * 25.4) / 72;
        const rotHMm = (testViewport.height * 25.4) / 72;

        // Calculate fit scale factor
        let scale = 1;
        if (settings.scaleMode === 'fit') {
          scale = Math.min(cellWidthMm / rotWMm, cellHeightMm / rotHMm);
        } else if (settings.scaleMode === 'fill') {
          scale = Math.max(cellWidthMm / rotWMm, cellHeightMm / rotHMm);
        } else if (settings.scaleMode === 'custom') {
          scale = settings.customScale / 100;
        } else {
          scale = 1;
        }

        // Target pixel resolution for crisp preview display
        const pixelScale = Math.max(1.5, Math.min(3.0, 800 / Math.max(testViewport.width, testViewport.height)));

        // Cancel previous render if any
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderViewport = page.getViewport({ scale: pixelScale, rotation: totalClockwiseAngle });
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport: renderViewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (active) {
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
  }, [pdfDocument, pageIndex, rotation, cellWidthMm, cellHeightMm, settings]);

  // Compute percentage of page relative to cell dimensions
  let scale = 1;
  // Estimate aspect ratio dimensions
  if (settings.scaleMode === 'fit') {
    // scale is proportional to cell
    scale = 1;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-neutral-100 overflow-hidden select-none">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-50/80 z-10">
          <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
        </div>
      )}
      {error ? (
        <div className="text-xs text-red-500 text-center p-2">Error de renderizado</div>
      ) : (
        <canvas
          ref={canvasRef}
          className={`shadow-2xs bg-white block transition-all ${
            settings.scaleMode === 'fill'
              ? 'w-full h-full object-cover'
              : settings.scaleMode === 'fit'
              ? 'max-w-full max-h-full object-contain'
              : 'object-contain'
          }`}
          style={
            settings.scaleMode === 'custom'
              ? { transform: `scale(${settings.customScale / 100})`, transformOrigin: 'center' }
              : undefined
          }
        />
      )}
    </div>
  );
};

interface ImpositionPreviewProps {
  settings: ImpositionSettings;
  plan: ImposedSheet[];
  sourcePDFInfo: PDFSourceInfo | null;
  pdfDocProxy: pdfjs.PDFDocumentProxy | null;
}

export const ImpositionPreview: React.FC<ImpositionPreviewProps> = ({
  settings,
  plan,
  sourcePDFInfo,
  pdfDocProxy,
}) => {
  const { t } = useI18n();
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [showLightTable, setShowLightTable] = useState(false);

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
        <p className="text-sm font-medium text-neutral-600 mb-1">Previsualización del Pliego</p>
        <p className="text-xs max-w-sm text-neutral-400">
          Carga un archivo PDF en el panel izquierdo para visualizar la imposición, el orden de páginas y las marcas de corte en tiempo real.
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

  // Margins in percentage for visual guide
  const isBack = activeSheet.side === 'back';
  const effMarginL = (isBack && settings.duplexMode !== 'short_edge') ? settings.marginRight : settings.marginLeft;
  const effMarginR = (isBack && settings.duplexMode !== 'short_edge') ? settings.marginLeft : settings.marginRight;
  const effMarginT = (isBack && settings.duplexMode === 'short_edge') ? settings.marginBottom : settings.marginTop;
  const effMarginB = (isBack && settings.duplexMode === 'short_edge') ? settings.marginTop : settings.marginBottom;

  const marginLPercent = (effMarginL / sheetW) * 100;
  const marginRPercent = (effMarginR / sheetW) * 100;
  const marginTPercent = (effMarginT / sheetH) * 100;
  const marginBPercent = (effMarginB / sheetH) * 100;

  // Paired sheet margins for Light Table overlay
  const isPairedBack = pairedSheet?.side === 'back';
  const pairedMarginL = (isPairedBack && settings.duplexMode !== 'short_edge') ? settings.marginRight : settings.marginLeft;
  const pairedMarginR = (isPairedBack && settings.duplexMode !== 'short_edge') ? settings.marginLeft : settings.marginRight;
  const pairedMarginT = (isPairedBack && settings.duplexMode === 'short_edge') ? settings.marginBottom : settings.marginTop;
  const pairedMarginB = (isPairedBack && settings.duplexMode === 'short_edge') ? settings.marginTop : settings.marginBottom;

  const pairedMarginLPercent = (pairedMarginL / sheetW) * 100;
  const pairedMarginRPercent = (pairedMarginR / sheetW) * 100;
  const pairedMarginTPercent = (pairedMarginT / sheetH) * 100;
  const pairedMarginBPercent = (pairedMarginB / sheetH) * 100;

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
    if (angle === 0) return { arrow: '▲', label: 'CABEZA ARRIBA (0°)' };
    if (angle === 90) return { arrow: '►', label: 'CABEZA DERECHA (90° Horario)' };
    if (angle === 180) return { arrow: '▼', label: 'CABEZA ABAJO (180° Invertido)' };
    return { arrow: '◄', label: 'CABEZA IZQUIERDA (270° Antihorario)' };
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
          label: isFold ? 'Lomo / Doblez' : 'Corte Guillotina',
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
          label: isFrenchFold ? 'Doblez en cruz' : 'Corte Guillotina',
        });
      }
    }

    return { verticalLines, horizontalLines };
  }, [settings.layoutMode, settings.booklet4UpMode, activeSheet, sheetW, sheetH]);

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
              {t.preview.sheetOf} {currentSheetIdx + 1} {t.preview.totalSheets} {plan.length} • Hoja {settings.sheetPreset} ({sheetW} × {sheetH} mm) • {activeSheet.cells.length} casillas ({activeSheet.cells[0] ? `${activeSheet.cells[0].width.toFixed(1)} × ${activeSheet.cells[0].height.toFixed(1)} mm` : ''})
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
                title={`Cambiar vista al ${activeSheet.side === 'front' ? 'Reverso / Retiro' : 'Anverso / Tiro'}`}
                id="btn-toggle-flip"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-500" />
                <span>Voltear a <strong className="font-semibold text-neutral-900">{activeSheet.side === 'front' ? 'Reverso' : 'Anverso'}</strong></span>
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
              title="Pliego anterior"
              id="btn-prev-sheet"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-xs font-mono font-medium text-neutral-600 px-2 select-none">
              {currentSheetIdx + 1} / {plan.length}
            </span>

            <button
              onClick={nextSheet}
              disabled={currentSheetIdx === plan.length - 1}
              className="p-1 rounded-md hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-neutral-600"
              title="Siguiente pliego"
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
                <span>MESA DE LUZ ACTIVA · Calce de {pairedSheet.side === 'front' ? 'Tiro' : 'Retiro'} a contraluz</span>
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
                  transform: settings.duplexMode === 'short_edge' ? 'scaleY(-1)' : 'scaleX(-1)',
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
                  const pPageLabel = pHasPage ? `Pág. ${pCell.sourcePageIndex! + 1}` : 'Blanco';

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
                          transform: settings.duplexMode === 'short_edge' ? 'scaleY(-1)' : 'scaleX(-1)',
                        }}
                      >
                        <span className="font-bold">
                          {pairedSheet.side === 'front' ? 'Tiro' : 'Retiro'}: {pPageLabel}
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
              const pageLabel = hasPage ? `Pág. ${cell.sourcePageIndex! + 1}` : 'Blanco';
              const headInfo = getHeadIndicator(cell.rotation);

              return (
                <div
                  key={`${currentSheetIdx}-cell-${idx}`}
                  className="absolute border border-neutral-200/90 bg-neutral-50 flex flex-col justify-between overflow-hidden"
                  style={{
                    left: `${cellLeft}%`,
                    top: `${cellTop}%`,
                    width: `${cellWPercent}%`,
                    height: `${cellHPercent}%`,
                  }}
                >
                  {/* Actual Page Rendering */}
                  {hasPage && pdfDocProxy ? (
                    <PDFPageThumbnail
                      pdfDocument={pdfDocProxy}
                      pageIndex={cell.sourcePageIndex!}
                      rotation={cell.rotation}
                      cellWidthMm={cell.width}
                      cellHeightMm={cell.height}
                      settings={settings}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 relative select-none bg-neutral-100/40">
                      <svg className="absolute inset-0 w-full h-full text-neutral-200/70 pointer-events-none" preserveAspectRatio="none">
                        <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
                        <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
                      </svg>
                      <span className="z-10 text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                        Página en blanco
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
                      <span>CAB</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Crop Marks (Marcas de Corte) */}
            {settings.drawCropMarks && activeSheet.cells.map((cell, idx) => {
              const cellLeft = (cell.x / sheetW) * 100;
              const cellTop = (cell.y / sheetH) * 100;
              const cellWPercent = (cell.width / sheetW) * 100;
              const cellHPercent = (cell.height / sheetH) * 100;

              return (
                <div key={`crop-marks-${idx}`} className="absolute pointer-events-none inset-0 z-30">
                  {/* Top-Left */}
                  <div className="absolute w-[10px] h-[0.75px] bg-neutral-700" style={{ left: `calc(${cellLeft}% - 8px)`, top: `${cellTop}%` }} />
                  <div className="absolute w-[0.75px] h-[10px] bg-neutral-700" style={{ left: `${cellLeft}%`, top: `calc(${cellTop}% - 8px)` }} />
                  
                  {/* Top-Right */}
                  <div className="absolute w-[10px] h-[0.75px] bg-neutral-700" style={{ left: `calc(${cellLeft + cellWPercent}% - 2px)`, top: `${cellTop}%` }} />
                  <div className="absolute w-[0.75px] h-[10px] bg-neutral-700" style={{ left: `${cellLeft + cellWPercent}%`, top: `calc(${cellTop}% - 8px)` }} />
                  
                  {/* Bottom-Left */}
                  <div className="absolute w-[10px] h-[0.75px] bg-neutral-700" style={{ left: `calc(${cellLeft}% - 8px)`, top: `${cellTop + cellHPercent}%` }} />
                  <div className="absolute w-[0.75px] h-[10px] bg-neutral-700" style={{ left: `${cellLeft}%`, top: `calc(${cellTop + cellHPercent}% - 2px)` }} />
                  
                  {/* Bottom-Right */}
                  <div className="absolute w-[10px] h-[0.75px] bg-neutral-700" style={{ left: `calc(${cellLeft + cellWPercent}% - 2px)`, top: `${cellTop + cellHPercent}%` }} />
                  <div className="absolute w-[0.75px] h-[10px] bg-neutral-700" style={{ left: `${cellLeft + cellWPercent}%`, top: `calc(${cellTop + cellHPercent}% - 2px)` }} />
                </div>
              );
            })}

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

      {/* Info & Orientation Guide */}
      <div className="mt-3 bg-white rounded-lg p-3 text-xs text-neutral-500 border border-neutral-200/80 flex gap-2 items-start select-none shadow-2xs">
        <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-semibold text-neutral-700 mb-0.5">
            Orientación de Impresión (▲ CAB = Cabeza / Encabezado del documento original):
          </p>
          <p className="text-[11px] text-neutral-500">
            La flecha indica la parte superior física del diseño. En modo doble cara (dúplex), puedes pulsar <strong className="text-neutral-700 font-semibold">Voltear</strong> para alternar entre tiro y retiro, o activar <strong className="text-amber-800 font-semibold">Trasluz</strong> para inspeccionar el registro y calce front-to-back a contraluz como en una mesa de luz de preimpresión.
          </p>
        </div>
      </div>
    </div>
  );
};
