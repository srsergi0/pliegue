import { ImpositionSettings, ImposedSheet, ImpositionCell, PDFSourceInfo, TARGET_PAGE_PRESETS, PagePart, SpacerReason } from '../types';

export interface VirtualPage {
  sourcePageIndex: number | null;
  part: PagePart;
  width: number;
  height: number;
  isSpacerBlank?: boolean;
  spacerReason?: SpacerReason;
}

/**
 * Localized strings used to build human-readable sheet labels
 * (e.g. "Hoja 1 · Anverso (Tiro)"). Placeholders: {n}, {m}, {a}, {b}, {c}, {r}.
 */
export interface SheetLabelStrings {
  sheet: string;
  front: string;
  back: string;
  pressFront: string;
  pressBack: string;
  faceFront: string;
  faceBack: string;
  crossFold8: string;
  twinBooklets: string;
  signaturesOf: string;
  bookletCutNest: string;
  cutAndStack: string;
  repeatedPage: string;
  repeatedSheet: string;
  sheetOf: string;
}

export const ES_SHEET_LABELS: SheetLabelStrings = {
  sheet: 'Hoja',
  front: 'Anverso',
  back: 'Reverso',
  pressFront: 'Tiro',
  pressBack: 'Retiro',
  faceFront: 'Frente',
  faceBack: 'Dorso',
  crossFold8: 'Plegado en Cruz 8 págs',
  twinBooklets: '{n} Folletos Gemelos',
  signaturesOf: '{n} Cuadernillos de {m} págs',
  bookletCutNest: 'Folleto {n} págs · Corte y Encarte',
  cutAndStack: 'Corte & Apilado',
  repeatedPage: 'Pág. {n} Repetida',
  repeatedSheet: 'Pliego Pág. {n} Repetida ({c}x{r})',
  sheetOf: 'Pliego {a} de {b}',
};

function fill(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/**
 * Builds the effective list of pages to impose.
 * Supports:
 * 1. Manga / Spreads: Splits panoramic/landscape pages into two halves on facing internal pages.
 * 2. Cara y Contracara:
 *    - blankAfterFrontCover: Inserts a courtesy blank page right after the front cover (inside front cover).
 *    - blankBeforeBackCover: Inserts a blank page before the back cover and pins the back cover to the booklet exterior.
 */
export function buildVirtualPageList(
  settings: ImpositionSettings,
  sourcePDF: PDFSourceInfo | null
): VirtualPage[] {
  if (!sourcePDF || sourcePDF.pageCount === 0) return [];

  const excludedSet = new Set(settings.excludedPageIndices || []);
  const activePageIndices: number[] = [];
  for (let i = 0; i < sourcePDF.pageCount; i++) {
    if (!excludedSet.has(i)) {
      activePageIndices.push(i);
    }
  }

  if (activePageIndices.length === 0) return [];

  const list: VirtualPage[] = [];

  // Edge case: single active page document
  if (activePageIndices.length === 1) {
    const pIdx = activePageIndices[0];
    const page = sourcePDF.pages[pIdx] || { width: sourcePDF.firstPageWidth, height: sourcePDF.firstPageHeight };
    list.push({
      sourcePageIndex: pIdx,
      part: 'full',
      width: page.width,
      height: page.height,
    });
    return list;
  }

  // 1. First Active Page (Front Cover / Cara)
  const firstIdx = activePageIndices[0];
  const p0 = sourcePDF.pages[firstIdx] || { width: sourcePDF.firstPageWidth, height: sourcePDF.firstPageHeight };
  const isDoubleP0 = settings.splitDoubleSpreads && (p0.width > p0.height * 1.15);

  if (!isDoubleP0) {
    list.push({
      sourcePageIndex: firstIdx,
      part: 'full',
      width: p0.width,
      height: p0.height,
    });
  } else {
    const firstPart: PagePart = settings.bindingEdge === 'right' ? 'right_half' : 'left_half';
    const secondPart: PagePart = settings.bindingEdge === 'right' ? 'left_half' : 'right_half';
    list.push({ sourcePageIndex: firstIdx, part: firstPart, width: p0.width / 2, height: p0.height });
    list.push({ sourcePageIndex: firstIdx, part: secondPart, width: p0.width / 2, height: p0.height });
  }

  // 1b. Alignment spacer moved to the BEGINNING of the book:
  // Check if double spreads among remaining active pages require a parity shift so they start on facing internal pages.
  if (settings.layoutMode === 'booklet' && settings.splitDoubleSpreads) {
    let firstDoubleOffset = -1;
    for (let k = 1; k < activePageIndices.length; k++) {
      const pIdx = activePageIndices[k];
      const page = sourcePDF.pages[pIdx] || { width: sourcePDF.firstPageWidth, height: sourcePDF.firstPageHeight };
      if (page.width > page.height * 1.15) {
        firstDoubleOffset = k;
        break;
      }
    }

    if (firstDoubleOffset !== -1) {
      let pagesBeforeFirstSpread = list.length;
      for (let k = 1; k < firstDoubleOffset; k++) {
        const pIdx = activePageIndices[k];
        const page = sourcePDF.pages[pIdx] || { width: sourcePDF.firstPageWidth, height: sourcePDF.firstPageHeight };
        const isD = page.width > page.height * 1.15;
        pagesBeforeFirstSpread += isD ? 2 : 1;
      }

      // In booklet imposition, facing internal pairs start at an ODD 0-based index (e.g. 1, 3, 5...)
      // If pagesBeforeFirstSpread % 2 === 0, the spread would start on an even index and be split across turns.
      // We insert an alignment courtesy page at the BEGINNING of the book so reading flow inside the story is never broken!
      if (pagesBeforeFirstSpread % 2 === 0) {
        list.push({
          sourcePageIndex: null,
          part: 'full',
          width: p0.width / (isDoubleP0 ? 2 : 1),
          height: p0.height,
          isSpacerBlank: true,
          spacerReason: 'spread_alignment_start',
        });
      }
    }
  }

  // 2. Remaining Active Pages (Story pages: purely consecutive, no blank pages breaking reading rhythm!)
  for (let k = 1; k < activePageIndices.length; k++) {
    const pIdx = activePageIndices[k];
    const page = sourcePDF.pages[pIdx] || { width: sourcePDF.firstPageWidth, height: sourcePDF.firstPageHeight };
    const isDouble = settings.splitDoubleSpreads && (page.width > page.height * 1.15);

    if (!isDouble) {
      list.push({
        sourcePageIndex: pIdx,
        part: 'full',
        width: page.width,
        height: page.height,
      });
    } else {
      const firstPart: PagePart = settings.bindingEdge === 'right' ? 'right_half' : 'left_half';
      const secondPart: PagePart = settings.bindingEdge === 'right' ? 'left_half' : 'right_half';

      list.push({
        sourcePageIndex: pIdx,
        part: firstPart,
        width: page.width / 2,
        height: page.height,
      });
      list.push({
        sourcePageIndex: pIdx,
        part: secondPart,
        width: page.width / 2,
        height: page.height,
      });
    }
  }

  return list;
}

/**
 * Returns the effective sheet dimensions in mm considering orientation.
 */
export function getEffectiveSheetDimensions(settings: ImpositionSettings): { width: number; height: number } {
  const w = settings.sheetWidth;
  const h = settings.sheetHeight;
  if (settings.sheetOrientation === 'landscape') {
    return { width: Math.max(w, h), height: Math.min(w, h) };
  } else {
    return { width: Math.min(w, h), height: Math.max(w, h) };
  }
}

/**
 * Resolves the dimensions of the selected target page preset in mm.
 */
export function resolveTargetPageDimensions(
  settings: ImpositionSettings,
  sourcePDF: PDFSourceInfo | null
): { width: number; height: number; label: string } {
  if (settings.targetPagePreset === 'original' && sourcePDF) {
    return {
      width: sourcePDF.firstPageWidth,
      height: sourcePDF.firstPageHeight,
      label: `Original PDF (${sourcePDF.firstPageWidth.toFixed(1)} × ${sourcePDF.firstPageHeight.toFixed(1)} mm)`,
    };
  }

  if (settings.targetPagePreset === 'Custom') {
    return {
      width: settings.targetPageWidth || 100,
      height: settings.targetPageHeight || 100,
      label: `Personalizado (${settings.targetPageWidth} × ${settings.targetPageHeight} mm)`,
    };
  }

  const preset = TARGET_PAGE_PRESETS.find(p => p.name === settings.targetPagePreset);
  if (preset && preset.width > 0 && preset.height > 0) {
    return {
      width: preset.width,
      height: preset.height,
      label: preset.label,
    };
  }

  // Fallback / Auto
  return { width: 0, height: 0, label: 'Automático' };
}

/**
 * Calculates how many target pages fit on the specified sheet size,
 * optimizing columns, rows, orientation, and maximizing sheet usage.
 */
export function calculateOptimalTargetLayout(
  sheetW: number,
  sheetH: number,
  targetW: number,
  targetH: number,
  settings: ImpositionSettings
): {
  cols: number;
  rows: number;
  sheetOrientation: 'portrait' | 'landscape';
  autoRotate: boolean;
  totalFit: number;
  coveragePercent: number;
} {
  // If no target dimensions provided, fallback to current settings
  if (targetW <= 0 || targetH <= 0 || sheetW <= 0 || sheetH <= 0) {
    return {
      cols: settings.gridCols,
      rows: settings.gridRows,
      sheetOrientation: settings.sheetOrientation,
      autoRotate: settings.autoRotateToFit,
      totalFit: settings.gridCols * settings.gridRows,
      coveragePercent: 1,
    };
  }

  const sheetMin = Math.min(sheetW, sheetH);
  const sheetMax = Math.max(sheetW, sheetH);
  const targetMin = Math.min(targetW, targetH);
  const targetMax = Math.max(targetW, targetH);

  const isClose = (a: number, b: number) => Math.abs(a - b) <= 2.5;

  // A4 sheet (210 x 297 mm)
  if (isClose(sheetMin, 210) && isClose(sheetMax, 297)) {
    // A5 target (148.5 x 210) -> 2 pages (2 cols x 1 row in landscape)
    if (isClose(targetMin, 148.5) && isClose(targetMax, 210)) {
      return { cols: 2, rows: 1, sheetOrientation: 'landscape', autoRotate: false, totalFit: 2, coveragePercent: 1 };
    }
    // A6 target (105 x 148.5) -> 4 pages (2 cols x 2 rows in landscape)
    if (isClose(targetMin, 105) && isClose(targetMax, 148.5)) {
      return { cols: 2, rows: 2, sheetOrientation: 'landscape', autoRotate: true, totalFit: 4, coveragePercent: 1 };
    }
    // A7 target (74 x 105) -> 8 pages (4 cols x 2 rows in landscape)
    if (isClose(targetMin, 74) && isClose(targetMax, 105)) {
      return { cols: 4, rows: 2, sheetOrientation: 'landscape', autoRotate: false, totalFit: 8, coveragePercent: 1 };
    }
    // A8 target (52 x 74) -> 16 pages (4 cols x 4 rows in landscape)
    if (isClose(targetMin, 52) && isClose(targetMax, 74)) {
      return { cols: 4, rows: 4, sheetOrientation: 'landscape', autoRotate: true, totalFit: 16, coveragePercent: 1 };
    }
    // Business card (90 x 50) -> 10 or 12 cards (3 cols x 4 rows)
    if (isClose(targetMin, 50) && isClose(targetMax, 90)) {
      return { cols: 3, rows: 4, sheetOrientation: 'landscape', autoRotate: false, totalFit: 12, coveragePercent: 0.86 };
    }
    // Standard Card (85 x 55) -> 10 cards (5 cols x 2 rows)
    if (isClose(targetMin, 55) && isClose(targetMax, 85)) {
      return { cols: 5, rows: 2, sheetOrientation: 'landscape', autoRotate: true, totalFit: 10, coveragePercent: 0.75 };
    }
  }

  // A3 sheet (297 x 420 mm)
  if (isClose(sheetMin, 297) && isClose(sheetMax, 420)) {
    // A4 target (210 x 297) -> 2 pages (2 cols x 1 row in landscape)
    if (isClose(targetMin, 210) && isClose(targetMax, 297)) {
      return { cols: 2, rows: 1, sheetOrientation: 'landscape', autoRotate: false, totalFit: 2, coveragePercent: 1 };
    }
    // A5 target (148.5 x 210) -> 4 pages (2 cols x 2 rows in landscape)
    if (isClose(targetMin, 148.5) && isClose(targetMax, 210)) {
      return { cols: 2, rows: 2, sheetOrientation: 'landscape', autoRotate: true, totalFit: 4, coveragePercent: 1 };
    }
    // A6 target (105 x 148.5) -> 8 pages (4 cols x 2 rows in landscape)
    if (isClose(targetMin, 105) && isClose(targetMax, 148.5)) {
      return { cols: 4, rows: 2, sheetOrientation: 'landscape', autoRotate: false, totalFit: 8, coveragePercent: 1 };
    }
    // A7 target (74 x 105) -> 16 pages (4 cols x 4 rows in landscape)
    if (isClose(targetMin, 74) && isClose(targetMax, 105)) {
      return { cols: 4, rows: 4, sheetOrientation: 'landscape', autoRotate: true, totalFit: 16, coveragePercent: 1 };
    }
  }

  // Letter sheet (215.9 x 279.4 mm)
  if (isClose(sheetMin, 215.9) && isClose(sheetMax, 279.4)) {
    // HalfLetter target (139.7 x 215.9) -> 2 pages
    if (isClose(targetMin, 139.7) && isClose(targetMax, 215.9)) {
      return { cols: 2, rows: 1, sheetOrientation: 'landscape', autoRotate: false, totalFit: 2, coveragePercent: 1 };
    }
  }

  // General algorithm for any sheet or target dimensions:
  // Evaluates both sheet orientations and unrotated/rotated target orientations
  // with a 2% scaling margin tolerance so printer boundaries don't drop whole rows/cols.
  const orientations: Array<'portrait' | 'landscape'> = ['landscape', 'portrait'];
  let best = {
    cols: 1,
    rows: 1,
    sheetOrientation: settings.sheetOrientation,
    autoRotate: false,
    totalFit: 1,
    coveragePercent: 0,
  };

  for (const orient of orientations) {
    const sW = orient === 'landscape' ? sheetMax : sheetMin;
    const sH = orient === 'landscape' ? sheetMin : sheetMax;

    // Check Candidate 1: Target unrotated (targetW x targetH)
    const c1 = Math.max(1, Math.floor((sW * 1.02) / targetW));
    const r1 = Math.max(1, Math.floor((sH * 1.02) / targetH));
    const count1 = c1 * r1;
    const cov1 = (count1 * targetW * targetH) / (sW * sH);

    if (count1 > best.totalFit || (count1 === best.totalFit && cov1 > best.coveragePercent)) {
      best = {
        cols: c1,
        rows: r1,
        sheetOrientation: orient,
        autoRotate: false,
        totalFit: count1,
        coveragePercent: cov1,
      };
    }

    // Check Candidate 2: Target rotated 90 deg (targetH x targetW)
    const c2 = Math.max(1, Math.floor((sW * 1.02) / targetH));
    const r2 = Math.max(1, Math.floor((sH * 1.02) / targetW));
    const count2 = c2 * r2;
    const cov2 = (count2 * targetW * targetH) / (sW * sH);

    if (count2 > best.totalFit || (count2 === best.totalFit && cov2 > best.coveragePercent)) {
      best = {
        cols: c2,
        rows: r2,
        sheetOrientation: orient,
        autoRotate: true,
        totalFit: count2,
        coveragePercent: cov2,
      };
    }
  }

  return best;
}

/**
 * Normalizes quarter-turn rotations, including negative back-side corrections.
 */
function normalizeRotation(angle: number): 0 | 90 | 180 | 270 {
  return (((angle % 360) + 360) % 360) as 0 | 90 | 180 | 270;
}

/**
 * A vertical turn axis mirrors columns; a horizontal turn axis mirrors rows.
 * Long/short edge refer to the physical sheet, not fixed screen axes.
 */
function isBackSideHorizontallyMirrored(settings: ImpositionSettings): boolean {
  // Explicit back faces in sheetwise/manual printing use a book turn by default.
  if (settings.duplexMode === 'simplex') return true;

  const { width, height } = getEffectiveSheetDimensions(settings);
  const isLandscape = width > height;
  return settings.duplexMode === 'short_edge' ? isLandscape : !isLandscape;
}

/**
 * Converts the complete front-facing orientation to the back-facing orientation.
 */
function calculateBackSideRotation(
  frontRotation: number,
  settings: ImpositionSettings
): 0 | 90 | 180 | 270 {
  // First reflect the natural rotation (including auto-fit and fold offsets).
  // A vertical-axis turn gives -theta; a horizontal-axis turn gives 180 - theta.
  // Thus landscape booklets naturally use short-edge turns, while portrait
  // booklets naturally use long-edge turns. Left/right binding changes page order,
  // not the turn axis. Apply the user's back-only correction last, exactly once.
  const turnRotation = isBackSideHorizontallyMirrored(settings) ? 0 : 180;
  return normalizeRotation(turnRotation - frontRotation + (settings.reverseRotation || 0));
}

/**
 * Checks if a rotation angle in degrees is portrait-swapping (90 or 270).
 */
export function isAngleLandscapeSwapping(angle: number): boolean {
  const rotation = normalizeRotation(angle);
  return rotation === 90 || rotation === 270;
}

/**
 * Calculates the positioning, scaling and cropping parameters for placing a source page inside an imposition cell.
 * All dimensions are in mm.
 */
export interface CellPlacement {
  scale: number;
  rotate: 0 | 90 | 180 | 270;
  dx: number; // translation X inside the cell (offset to center the page in mm)
  dy: number; // translation Y inside the cell in mm
  originalWidth: number;
  originalHeight: number;
  renderedWidth: number; // scaled and rotated width
  renderedHeight: number; // scaled and rotated height
}

export function calculateCellPlacement(
  cellWidth: number,
  cellHeight: number,
  sourcePageWidth: number,
  sourcePageHeight: number,
  settings: ImpositionSettings,
  isBackSide: boolean = false
): CellPlacement {
  // 1. Calculate the natural front-facing rotation first.
  const baseRotation = normalizeRotation(settings.pageRotation);
  let finalRotation = baseRotation;

  // 2. Intelligent Auto-rotate
  if (settings.autoRotateToFit) {
    const isSwapped = isAngleLandscapeSwapping(baseRotation);
    const effW = isSwapped ? sourcePageHeight : sourcePageWidth;
    const effH = isSwapped ? sourcePageWidth : sourcePageHeight;

    const cellAspect = cellWidth / cellHeight;
    const pageAspect = effW / effH;

    const isCellLandscape = cellAspect > 1.05;
    const isPageLandscape = pageAspect > 1.05;
    const isCellPortrait = cellAspect < 0.95;
    const isPagePortrait = pageAspect < 0.95;

    // If one is landscape and the other is portrait, rotate 90 degrees clockwise to fit better
    if ((isCellLandscape && isPagePortrait) || (isCellPortrait && isPageLandscape)) {
      finalRotation = normalizeRotation(baseRotation + 90);
    }
  }

  // Reflect only after auto-fit: reflecting the base angle and then adding +90
  // would put a rotated reverse 180 degrees away from its matching front.
  // reverseRotation is a final correction, so auto-fit must not cancel it.
  if (isBackSide) {
    finalRotation = calculateBackSideRotation(finalRotation, settings);
  }

  // 3. Rotated page dimensions in mm
  const isSwapped = isAngleLandscapeSwapping(finalRotation);
  const rotPageW = isSwapped ? sourcePageHeight : sourcePageWidth;
  const rotPageH = isSwapped ? sourcePageWidth : sourcePageHeight;

  // 4. Scaling factor
  let scale = 1;
  if (settings.scaleMode === 'fit') {
    const scaleX = cellWidth / rotPageW;
    const scaleY = cellHeight / rotPageH;
    scale = Math.min(scaleX, scaleY);
  } else if (settings.scaleMode === 'fill') {
    const scaleX = cellWidth / rotPageW;
    const scaleY = cellHeight / rotPageH;
    scale = Math.max(scaleX, scaleY);
  } else if (settings.scaleMode === 'custom') {
    scale = settings.customScale / 100;
  } else {
    scale = 1;
  }

  const renderedWidth = rotPageW * scale;
  const renderedHeight = rotPageH * scale;

  // 5. Center page inside the cell
  const dx = (cellWidth - renderedWidth) / 2;
  const dy = (cellHeight - renderedHeight) / 2;

  return {
    scale,
    rotate: finalRotation,
    dx,
    dy,
    originalWidth: sourcePageWidth,
    originalHeight: sourcePageHeight,
    renderedWidth,
    renderedHeight
  };
}

/**
 * Builds the sheet layouts mapping source pages to output sheets.
 */
export function generateImpositionPlan(
  settings: ImpositionSettings,
  sourcePDF: PDFSourceInfo | null,
  L: SheetLabelStrings = ES_SHEET_LABELS
): ImposedSheet[] {
  if (!sourcePDF || sourcePDF.pageCount === 0) {
    return [];
  }

  const virtualPages = buildVirtualPageList(settings, sourcePDF);
  const totalPages = virtualPages.length;
  if (totalPages === 0) {
    return [];
  }

  const { width: sheetW, height: sheetH } = getEffectiveSheetDimensions(settings);
  const mirrorBackHorizontally = isBackSideHorizontallyMirrored(settings);
  const sheets: ImposedSheet[] = [];

  // Helper to get page dimensions in mm
  const getPageDim = (vIdx: number | null, fallbackW: number, fallbackH: number) => {
    if (vIdx === null || vIdx < 0 || vIdx >= totalPages) {
      return { w: fallbackW, h: fallbackH };
    }
    return {
      w: virtualPages[vIdx]?.width || fallbackW,
      h: virtualPages[vIdx]?.height || fallbackH
    };
  };

  // Helper to create a cell
  const createCell = (
    c: number,
    r: number,
    vPageIdx: number | null,
    cellW: number,
    cellH: number,
    marginLeft: number,
    marginTop: number,
    gutterH: number,
    gutterV: number,
    isBackSide: boolean,
    extraRotation: number = 0
  ): ImpositionCell => {
    // Booklet page tables describe the natural reverse viewed around the
    // vertical spine. Changing to a horizontal turn requires rotating the
    // entire reverse layout 180 degrees, not just the artwork in each cell.
    // Its angular correction is already included by calculateBackSideRotation.
    if (isBackSide && settings.layoutMode === 'booklet' && !mirrorBackHorizontally) {
      c = Math.max(2, settings.gridCols) - 1 - c;
      r = Math.max(1, settings.gridRows) - 1 - r;
    }

    const x = marginLeft + c * (cellW + gutterH);
    const y = marginTop + r * (cellH + gutterV);
    const dims = getPageDim(vPageIdx, cellW, cellH);
    const placement = calculateCellPlacement(cellW, cellH, dims.w, dims.h, settings, false);

    // Fold offsets belong to the natural layout. Include them before reflecting
    // so the back transformation and reverseRotation are each applied only once.
    const naturalRotation = normalizeRotation(placement.rotate + extraRotation);
    const finalRot = isBackSide
      ? calculateBackSideRotation(naturalRotation, settings)
      : naturalRotation;

    const vPage = vPageIdx !== null && vPageIdx < totalPages ? virtualPages[vPageIdx] : null;

    return {
      colIndex: c,
      rowIndex: r,
      sourcePageIndex: vPage && vPage.sourcePageIndex !== null ? vPage.sourcePageIndex : null,
      pagePart: vPage?.part ?? 'full',
      isSpacerBlank: vPage?.isSpacerBlank ?? false,
      spacerReason: vPage?.spacerReason,
      rotation: finalRot,
      x,
      y,
      width: cellW,
      height: cellH,
    };
  };

  // -------------------------------------------------------------
  // MODE 1: FOLLETO / CUADERNILLO (BOOKLET / SADDLE STITCH & SIGNATURES)
  // Supports 2 pages/face (2x1) AND 4 pages/face (2x2, 4x1) or any grid!
  // -------------------------------------------------------------
  if (settings.layoutMode === 'booklet') {
    const cols = Math.max(2, settings.gridCols);
    const rows = Math.max(1, settings.gridRows);
    const spreadCols = Math.max(1, Math.floor(cols / 2));
    const spreadsPerSheet = spreadCols * rows;
    const pagesPerSheet = 4 * spreadsPerSheet; // e.g. 2 cols x 2 rows = 8 pages/sheet

    const availW = Math.max(1, sheetW - settings.marginLeft - settings.marginRight - (cols - 1) * settings.gutterHorizontal);
    const availH = Math.max(1, sheetH - settings.marginTop - settings.marginBottom - (rows - 1) * settings.gutterVertical);
    const bCellW = availW / cols;
    const bCellH = availH / rows;

    // Mirror margins on the same physical axis used for positions and rotation.
    const backMarginLeft = mirrorBackHorizontally ? settings.marginRight : settings.marginLeft;
    const backMarginTop = mirrorBackHorizontally ? settings.marginTop : settings.marginBottom;

    const booklet4Up = settings.booklet4UpMode || 'cut_and_nest';

    let globalSheetNumber = 1;

    // Check if French fold mode is chosen (only for 2 cols x 2 rows)
    if (spreadsPerSheet >= 2 && booklet4Up === 'french_fold') {
      const sigStep = settings.signatureSize > 0 ? settings.signatureSize : totalPages;
      const totalSignatures = Math.ceil(totalPages / sigStep);

      for (let sig = 0; sig < totalSignatures; sig++) {
        const sigStart = sig * sigStep;
        const sigPageCount = Math.min(sigStep, totalPages - sigStart);
        const sigPaddedCount = Math.ceil(sigPageCount / 8) * 8;
        const sigSheets = sigPaddedCount / 8;

        for (let s = 0; s < sigSheets; s++) {
          const base = sigStart + s * 8;
          const getP = (offset: number) => {
            const p = base + offset;
            return (p < sigStart + sigPageCount && p < totalPages) ? p : null;
          };

          // 8-page French fold signature (Top row is rotated 180 head-to-head)
          const p1 = getP(0);
          const p2 = getP(1);
          const p3 = getP(2);
          const p4 = getP(3);
          const p5 = getP(4);
          const p6 = getP(5);
          const p7 = getP(6);
          const p8 = getP(7);

          // Front side:
          // Row 0: P5 (rot 180), P4 (rot 180)
          // Row 1: P8, P1
          const frontCells: ImpositionCell[] = [
            createCell(0, 0, settings.bindingEdge === 'right' ? p4 : p5, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false, 180),
            createCell(1, 0, settings.bindingEdge === 'right' ? p5 : p4, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false, 180),
            createCell(0, 1, settings.bindingEdge === 'right' ? p1 : p8, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false, 0),
            createCell(1, 1, settings.bindingEdge === 'right' ? p8 : p1, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false, 0),
          ];

          sheets.push({
            sheetIndex: sheets.length,
            sheetNumber: globalSheetNumber,
            side: 'front',
            label: `${L.sheet} ${globalSheetNumber} · ${L.front} (${L.crossFold8})`,
            cells: frontCells,
          });

          if (settings.duplexMode !== 'simplex') {
            // Natural back side, before conversion to the selected duplex axis:
            // Row 0: P3 (rot 180), P6 (rot 180)
            // Row 1: P2, P7
            const backCells: ImpositionCell[] = [
              createCell(0, 0, settings.bindingEdge === 'right' ? p6 : p3, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true, 180),
              createCell(1, 0, settings.bindingEdge === 'right' ? p3 : p6, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true, 180),
              createCell(0, 1, settings.bindingEdge === 'right' ? p7 : p2, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true, 0),
              createCell(1, 1, settings.bindingEdge === 'right' ? p2 : p7, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true, 0),
            ];

            sheets.push({
              sheetIndex: sheets.length,
              sheetNumber: globalSheetNumber,
              side: 'back',
              label: `${L.sheet} ${globalSheetNumber} · ${L.back} (${L.crossFold8})`,
              cells: backCells,
            });
          }

          globalSheetNumber++;
        }
      }

      return sheets;
    }

    // Duplicate mode (2 or more identical copies of the booklet spreads on each sheet)
    if (spreadsPerSheet >= 2 && booklet4Up === 'duplicate_2up') {
      const sigStep = settings.signatureSize > 0 ? settings.signatureSize : totalPages;
      const totalSignatures = Math.ceil(totalPages / sigStep);

      for (let sig = 0; sig < totalSignatures; sig++) {
        const sigStart = sig * sigStep;
        const sigPageCount = Math.min(sigStep, totalPages - sigStart);
        const sigPaddedCount = Math.ceil(sigPageCount / 4) * 4;
        const sigSheets = sigPaddedCount / 4;

        for (let s = 0; s < sigSheets; s++) {
          let flPageIdx: number | null = sigStart + (sigPaddedCount - 2 * s - 1);
          let frPageIdx: number | null = sigStart + (2 * s);
          if (flPageIdx >= sigStart + sigPageCount || flPageIdx >= totalPages) flPageIdx = null;
          if (frPageIdx >= sigStart + sigPageCount || frPageIdx >= totalPages) frPageIdx = null;

          let col0Front = flPageIdx;
          let col1Front = frPageIdx;
          if (settings.bindingEdge === 'right') {
            col0Front = frPageIdx;
            col1Front = flPageIdx;
          }

          const frontCells: ImpositionCell[] = [];
          for (let r = 0; r < rows; r++) {
            for (let sc = 0; sc < spreadCols; sc++) {
              frontCells.push(
                createCell(sc * 2, r, col0Front, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false),
                createCell(sc * 2 + 1, r, col1Front, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
              );
            }
          }

          sheets.push({
            sheetIndex: sheets.length,
            sheetNumber: globalSheetNumber,
            side: 'front',
            label: `${L.sheet} ${globalSheetNumber} · ${L.front} (${fill(L.twinBooklets, { n: spreadsPerSheet })})`,
            cells: frontCells,
          });

          if (settings.duplexMode !== 'simplex') {
            let blPageIdx: number | null = sigStart + (2 * s + 1);
            let brPageIdx: number | null = sigStart + (sigPaddedCount - 2 * s - 2);
            if (blPageIdx >= sigStart + sigPageCount || blPageIdx >= totalPages) blPageIdx = null;
            if (brPageIdx >= sigStart + sigPageCount || brPageIdx >= totalPages) brPageIdx = null;

            let col0Back = blPageIdx;
            let col1Back = brPageIdx;
            if (settings.bindingEdge === 'right') {
              col0Back = brPageIdx;
              col1Back = blPageIdx;
            }

            // Identical copies use the same natural booklet reverse; createCell
            // converts both position and orientation for the selected turn axis.
            const backCells: ImpositionCell[] = [];
            for (let r = 0; r < rows; r++) {
              for (let sc = 0; sc < spreadCols; sc++) {
                backCells.push(
                  createCell(sc * 2, r, col0Back, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true),
                  createCell(sc * 2 + 1, r, col1Back, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
                );
              }
            }

            sheets.push({
              sheetIndex: sheets.length,
              sheetNumber: globalSheetNumber,
              side: 'back',
              label: `${L.sheet} ${globalSheetNumber} · ${L.back} (${fill(L.twinBooklets, { n: spreadsPerSheet })})`,
              cells: backCells,
            });
          }

          globalSheetNumber++;
        }
      }

      return sheets;
    }

    // -------------------------------------------------------------------------
    // Default Booklet mode: Cut & Nest (Continuous Booklet imposition)
    // Supports 1 row (2 pages/face) AND multi-row (4, 8 pages/face, e.g. 2x2, 4x2)
    // Supports arbitrary signature sizes (including signatureSize < pagesPerSheet)
    // -------------------------------------------------------------------------
    interface BookletSpreadPages {
      frontCol0: number | null;
      frontCol1: number | null;
      backCol0: number | null;
      backCol1: number | null;
      sigIndex: number;
    }

    const sigStep = settings.signatureSize > 0 ? settings.signatureSize : totalPages;
    const totalSignatures = Math.ceil(totalPages / sigStep);

    // Build all signatures and their spreads
    const allSignatures: Array<{ sigIndex: number; spreads: BookletSpreadPages[] }> = [];

    for (let sig = 0; sig < totalSignatures; sig++) {
      const sigStart = sig * sigStep;
      const sigPageCount = Math.min(sigStep, totalPages - sigStart);
      const sigSpreads = Math.ceil(sigPageCount / 4);
      const sigPaddedCount = sigSpreads * 4;

      const spreads: BookletSpreadPages[] = [];
      for (let sp = 0; sp < sigSpreads; sp++) {
        const fl = sigStart + (sigPaddedCount - 2 * sp - 1);
        const fr = sigStart + (2 * sp);
        const bl = sigStart + (2 * sp + 1);
        const br = sigStart + (sigPaddedCount - 2 * sp - 2);

        const safeP = (p: number) => (p < sigStart + sigPageCount && p < totalPages ? p : null);

        const pFL = safeP(fl);
        const pFR = safeP(fr);
        const pBL = safeP(bl);
        const pBR = safeP(br);

        spreads.push({
          frontCol0: settings.bindingEdge === 'right' ? pFR : pFL,
          frontCol1: settings.bindingEdge === 'right' ? pFL : pFR,
          backCol0: settings.bindingEdge === 'right' ? pBR : pBL,
          backCol1: settings.bindingEdge === 'right' ? pBL : pBR,
          sigIndex: sig,
        });
      }

      allSignatures.push({ sigIndex: sig, spreads });
    }

    const firstSigSpreads = allSignatures[0]?.spreads.length || 1;

    // Check if each signature has fewer spreads than fit on one physical sheet
    // e.g. signatureSize = 4 (1 spread), but 2x2 sheet holds 2 spreads (spreadsPerSheet = 2)
    if (firstSigSpreads < spreadsPerSheet && settings.signatureSize > 0) {
      // MULTIPLE SIGNATURES PER SHEET
      const sigsPerSheet = Math.max(1, Math.floor(spreadsPerSheet / firstSigSpreads));

      for (let sigChunkStart = 0; sigChunkStart < totalSignatures; sigChunkStart += sigsPerSheet) {
        const frontCells: ImpositionCell[] = [];
        const backCells: ImpositionCell[] = [];

        for (let sIdx = 0; sIdx < sigsPerSheet; sIdx++) {
          const sigIdx = sigChunkStart + sIdx;
          const sigObj = sigIdx < totalSignatures ? allSignatures[sigIdx] : null;

          for (let sp = 0; sp < firstSigSpreads; sp++) {
            const slot = sIdx * firstSigSpreads + sp;
            if (slot >= spreadsPerSheet) break;

            const r = Math.floor(slot / spreadCols);
            const sc = slot % spreadCols;
            // Build the natural vertical-axis reverse first. createCell handles
            // the 180-degree layout conversion if the printer turns horizontally.
            const backSc = spreadCols - 1 - sc;

            const spread = sigObj && sp < sigObj.spreads.length ? sigObj.spreads[sp] : null;

            frontCells.push(
              createCell(sc * 2, r, spread?.frontCol0 ?? null, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false),
              createCell(sc * 2 + 1, r, spread?.frontCol1 ?? null, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
            );

            backCells.push(
              createCell(backSc * 2, r, spread?.backCol0 ?? null, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true),
              createCell(backSc * 2 + 1, r, spread?.backCol1 ?? null, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
            );
          }
        }

        const isMultiSpread = spreadsPerSheet > 1;
        sheets.push({
          sheetIndex: sheets.length,
          sheetNumber: globalSheetNumber,
          side: 'front',
          label: isMultiSpread
            ? `${L.sheet} ${globalSheetNumber} · ${L.front} (${fill(L.signaturesOf, { n: sigsPerSheet, m: sigStep })})`
            : `${L.sheet} ${globalSheetNumber} · ${L.front} (${L.pressFront})`,
          cells: frontCells,
        });

        if (settings.duplexMode !== 'simplex') {
          sheets.push({
            sheetIndex: sheets.length,
            sheetNumber: globalSheetNumber,
            side: 'back',
            label: isMultiSpread
              ? `${L.sheet} ${globalSheetNumber} · ${L.back} (${fill(L.signaturesOf, { n: sigsPerSheet, m: sigStep })})`
              : `${L.sheet} ${globalSheetNumber} · ${L.back} (${L.pressBack})`,
            cells: backCells,
          });
        }

        globalSheetNumber++;
      }
    } else {
      // STANDARD / MULTI-SHEET SIGNATURES (sigSpreads >= spreadsPerSheet OR single signature)
      for (const sigObj of allSignatures) {
        const sigSpreads = sigObj.spreads.length;
        const sigSheets = Math.max(1, Math.ceil(sigSpreads / spreadsPerSheet));

        for (let s = 0; s < sigSheets; s++) {
          const frontCells: ImpositionCell[] = [];
          const backCells: ImpositionCell[] = [];

          for (let slot = 0; slot < spreadsPerSheet; slot++) {
            const r = Math.floor(slot / spreadCols);
            const sc = slot % spreadCols;
            // Keep spread pairing in the natural booklet reverse convention.
            const backSc = spreadCols - 1 - sc;
            const spreadIdx = s + slot * sigSheets;

            const spread = spreadIdx < sigSpreads ? sigObj.spreads[spreadIdx] : null;

            frontCells.push(
              createCell(sc * 2, r, spread?.frontCol0 ?? null, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false),
              createCell(sc * 2 + 1, r, spread?.frontCol1 ?? null, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
            );

            backCells.push(
              createCell(backSc * 2, r, spread?.backCol0 ?? null, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true),
              createCell(backSc * 2 + 1, r, spread?.backCol1 ?? null, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
            );
          }

          const isMultiSpread = spreadsPerSheet > 1;
          sheets.push({
            sheetIndex: sheets.length,
            sheetNumber: globalSheetNumber,
            side: 'front',
            label: isMultiSpread
              ? `${L.sheet} ${globalSheetNumber} · ${L.front} (${fill(L.bookletCutNest, { n: cols * rows })})`
              : `${L.sheet} ${globalSheetNumber} · ${L.front} (${L.pressFront})`,
            cells: frontCells,
          });

          if (settings.duplexMode !== 'simplex') {
            sheets.push({
              sheetIndex: sheets.length,
              sheetNumber: globalSheetNumber,
              side: 'back',
              label: isMultiSpread
                ? `${L.sheet} ${globalSheetNumber} · ${L.back} (${fill(L.bookletCutNest, { n: cols * rows })})`
                : `${L.sheet} ${globalSheetNumber} · ${L.back} (${L.pressBack})`,
              cells: backCells,
            });
          }

          globalSheetNumber++;
        }
      }
    }

    return sheets;
  }

  // -------------------------------------------------------------
  // GENERAL GRID DIMENSIONS FOR MODES 2, 3, 4, 5
  // -------------------------------------------------------------
  const cols = settings.gridCols;
  const rows = settings.gridRows;
  const slotsPerSheet = cols * rows;

  const availW = Math.max(1, sheetW - settings.marginLeft - settings.marginRight - (cols - 1) * settings.gutterHorizontal);
  const availH = Math.max(1, sheetH - settings.marginTop - settings.marginBottom - (rows - 1) * settings.gutterVertical);
  const cellW = availW / cols;
  const cellH = availH / rows;

  // Mirrored back margins use the physical turn axis, including sheet orientation.
  const backMarginLeft = mirrorBackHorizontally ? settings.marginRight : settings.marginLeft;
  const backMarginTop = mirrorBackHorizontally ? settings.marginTop : settings.marginBottom;

  // Helper to get (col, row) from 0-based slot index based on gridOrder
  const getColRow = (slotIdx: number): { c: number; r: number } => {
    if (settings.gridOrder === 'columns') {
      const c = Math.floor(slotIdx / rows);
      const r = slotIdx % rows;
      return { c, r };
    } else {
      const r = Math.floor(slotIdx / cols);
      const c = slotIdx % cols;
      return { c, r };
    }
  };

  // Helper to get mirrored back slot (colBack, rowBack) for perfect double-sided alignment
  const getMirroredBackPos = (cFront: number, rFront: number): { cBack: number; rBack: number } => {
    if (mirrorBackHorizontally) {
      // Vertical turn axis: portrait long edge or landscape short edge.
      return { cBack: cols - 1 - cFront, rBack: rFront };
    } else {
      // Horizontal turn axis: portrait short edge or landscape long edge.
      return { cBack: cFront, rBack: rows - 1 - rFront };
    }
  };

  // -------------------------------------------------------------
  // MODE 2: CUADRÍCULA DÚPLEX (SHEETWISE / FRONT & BACK MATCHING)
  // -------------------------------------------------------------
  if (settings.layoutMode === 'duplex_sheetwise') {
    if (settings.duplexItemMode === 'two_page_items') {
      // Source PDF contains 2-page items: [Front 1, Back 1, Front 2, Back 2...]
      const totalItems = Math.ceil(totalPages / 2);
      const totalPhysicalSheets = Math.ceil(totalItems / slotsPerSheet);

      for (let s = 0; s < totalPhysicalSheets; s++) {
        const sheetNum = s + 1;
        const frontCells: ImpositionCell[] = [];
        const backCells: ImpositionCell[] = [];

        // Build mapping of slots
        for (let slot = 0; slot < slotsPerSheet; slot++) {
          const itemIdx = s * slotsPerSheet + slot;
          const frontPageIdx = itemIdx * 2 < totalPages ? itemIdx * 2 : null;
          const backPageIdx = itemIdx * 2 + 1 < totalPages ? itemIdx * 2 + 1 : null;

          const { c, r } = getColRow(slot);
          frontCells.push(
            createCell(c, r, frontPageIdx, cellW, cellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
          );

          // Mirror position on back so that backPageIdx backs up frontPageIdx
          const { cBack, rBack } = getMirroredBackPos(c, r);
          backCells.push(
            createCell(cBack, rBack, backPageIdx, cellW, cellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
          );
        }

        sheets.push({
          sheetIndex: sheets.length,
          sheetNumber: sheetNum,
          side: 'front',
          label: `${L.sheet} ${sheetNum} · ${L.front} (${L.faceFront})`,
          cells: frontCells,
        });

        sheets.push({
          sheetIndex: sheets.length,
          sheetNumber: sheetNum,
          side: 'back',
          label: `${L.sheet} ${sheetNum} · ${L.back} (${L.faceBack})`,
          cells: backCells,
        });
      }
    } else {
      // Consecutive pages: Front gets K pages, Back gets next K pages
      const pagesPerPhysicalSheet = slotsPerSheet * 2;
      const totalPhysicalSheets = Math.ceil(totalPages / pagesPerPhysicalSheet);

      for (let s = 0; s < totalPhysicalSheets; s++) {
        const sheetNum = s + 1;
        const frontCells: ImpositionCell[] = [];
        const backCells: ImpositionCell[] = [];

        for (let slot = 0; slot < slotsPerSheet; slot++) {
          const frontPageIdx = s * pagesPerPhysicalSheet + slot;
          const { c, r } = getColRow(slot);
          frontCells.push(
            createCell(c, r, frontPageIdx < totalPages ? frontPageIdx : null, cellW, cellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
          );

          const backPageIdx = s * pagesPerPhysicalSheet + slotsPerSheet + slot;
          const { cBack, rBack } = getMirroredBackPos(c, r);
          backCells.push(
            createCell(cBack, rBack, backPageIdx < totalPages ? backPageIdx : null, cellW, cellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
          );
        }

        sheets.push({
          sheetIndex: sheets.length,
          sheetNumber: sheetNum,
          side: 'front',
            label: `${L.sheet} ${sheetNum} · ${L.front} (${L.pressFront})`,
          cells: frontCells,
        });

        sheets.push({
          sheetIndex: sheets.length,
          sheetNumber: sheetNum,
          side: 'back',
            label: `${L.sheet} ${sheetNum} · ${L.back} (${L.pressBack})`,
          cells: backCells,
        });
      }
    }

    return sheets;
  }

  // -------------------------------------------------------------
  // MODE 3: CORTE Y APILADO (CUT & STACK)
  // -------------------------------------------------------------
  if (settings.layoutMode === 'cut_and_stack') {
    if (settings.duplexMode === 'simplex') {
      const totalPhysicalSheets = Math.ceil(totalPages / slotsPerSheet);

      for (let s = 0; s < totalPhysicalSheets; s++) {
        const cells: ImpositionCell[] = [];
        for (let slot = 0; slot < slotsPerSheet; slot++) {
          const pageIdx = slot * totalPhysicalSheets + s;
          const { c, r } = getColRow(slot);
          cells.push(
            createCell(c, r, pageIdx < totalPages ? pageIdx : null, cellW, cellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
          );
        }

        sheets.push({
          sheetIndex: s,
          sheetNumber: s + 1,
          side: 'single',
          label: `${fill(L.sheetOf, { a: s + 1, b: totalPhysicalSheets })} (${L.cutAndStack})`,
          cells,
        });
      }
    } else {
      // Duplex Cut & Stack
      const totalPhysicalSheets = Math.ceil(totalPages / (slotsPerSheet * 2));

      for (let s = 0; s < totalPhysicalSheets; s++) {
        const sheetNum = s + 1;
        const frontCells: ImpositionCell[] = [];
        const backCells: ImpositionCell[] = [];

        for (let slot = 0; slot < slotsPerSheet; slot++) {
          const frontPageIdx = 2 * (slot * totalPhysicalSheets + s);
          const backPageIdx = frontPageIdx + 1;

          const { c, r } = getColRow(slot);
          frontCells.push(
            createCell(c, r, frontPageIdx < totalPages ? frontPageIdx : null, cellW, cellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
          );

          const { cBack, rBack } = getMirroredBackPos(c, r);
          backCells.push(
            createCell(cBack, rBack, backPageIdx < totalPages ? backPageIdx : null, cellW, cellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
          );
        }

        sheets.push({
          sheetIndex: sheets.length,
          sheetNumber: sheetNum,
          side: 'front',
            label: `${L.sheet} ${sheetNum} · ${L.front} (${L.cutAndStack})`,
          cells: frontCells,
        });

        sheets.push({
          sheetIndex: sheets.length,
          sheetNumber: sheetNum,
          side: 'back',
            label: `${L.sheet} ${sheetNum} · ${L.back} (${L.cutAndStack})`,
          cells: backCells,
        });
      }
    }

    return sheets;
  }

  // -------------------------------------------------------------
  // MODE 4: REPETICIÓN / TARJETAS (STEP & REPEAT)
  // -------------------------------------------------------------
  if (settings.layoutMode === 'step_and_repeat') {
    // If PDF has 2 pages and duplex mode is selected, create Front (Pág 1) and Back (Pág 2)
    if (totalPages === 2 && settings.duplexMode !== 'simplex') {
      const frontCells: ImpositionCell[] = [];
      const backCells: ImpositionCell[] = [];

      for (let slot = 0; slot < slotsPerSheet; slot++) {
        const { c, r } = getColRow(slot);
        frontCells.push(
          createCell(c, r, 0, cellW, cellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
        );
        const { cBack, rBack } = getMirroredBackPos(c, r);
        backCells.push(
          createCell(cBack, rBack, 1, cellW, cellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
        );
      }

      sheets.push({
        sheetIndex: 0,
        sheetNumber: 1,
        side: 'front',
          label: `${L.sheet} 1 · ${L.front} (${fill(L.repeatedPage, { n: 1 })})`,
        cells: frontCells,
      });

      sheets.push({
        sheetIndex: 1,
        sheetNumber: 1,
        side: 'back',
          label: `${L.sheet} 1 · ${L.back} (${fill(L.repeatedPage, { n: 2 })})`,
        cells: backCells,
      });

      return sheets;
    }

    // Default: each page gets its own full sheet
    for (let p = 0; p < totalPages; p++) {
      const cells: ImpositionCell[] = [];
      for (let slot = 0; slot < slotsPerSheet; slot++) {
        const { c, r } = getColRow(slot);
        cells.push(
          createCell(c, r, p, cellW, cellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
        );
      }

      sheets.push({
        sheetIndex: p,
        sheetNumber: p + 1,
        side: 'single',
          label: fill(L.repeatedSheet, { n: p + 1, c: cols, r: rows }),
        cells,
      });
    }

    return sheets;
  }

  // -------------------------------------------------------------
  // MODE 5: CUADRÍCULA SIMPLE SECUENCIAL (1 CARA / SIMPLEX)
  // -------------------------------------------------------------
  const totalSheets = Math.ceil(totalPages / slotsPerSheet);

  for (let s = 0; s < totalSheets; s++) {
    const cells: ImpositionCell[] = [];
    for (let slot = 0; slot < slotsPerSheet; slot++) {
      const pageIndex = s * slotsPerSheet + slot;
      const { c, r } = getColRow(slot);
      cells.push(
        createCell(c, r, pageIndex < totalPages ? pageIndex : null, cellW, cellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
      );
    }

    sheets.push({
      sheetIndex: s,
      sheetNumber: s + 1,
      side: 'single',
      label: fill(L.sheetOf, { a: s + 1, b: totalSheets }),
      cells,
    });
  }

  return sheets;
}