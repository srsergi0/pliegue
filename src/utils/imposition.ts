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
 * Builds the effective list of pages to impose (content order, before signature padding).
 * Supports:
 * 1. Manga / Spreads: Splits panoramic/landscape pages into two halves.
 *    - The leading cover block (first source page, if panoramic) stays consecutive
 *      at the start and is exempt from the interior odd-start rule.
 *    - Interior doubles (all split pages except the leading cover block) keep
 *      their halves contiguous and start at an ODD 0-based index.
 *    - A trailing panoramic page is NOT assumed to be a simple back cover: its
 *      halves stay together as one block. Cover courtesy blanks only apply to
 *      single-page covers (see below).
 * 2. Cara y Contracara (booklet only):
 *    - blankAfterFrontCover: courtesy blank right after the front-cover block.
 *    - blankBeforeBackCover: blank before a SINGLE back cover (skipped when the
 *      trailing block is a panoramic double, which is not a simple back cover).
 * Signature padding to the finishing multiple (4, or 8 for french_fold) is NOT
 * done here; see prepareBookletSignatures(). Blank dimensions always come from
 * the corresponding virtual page width, never from halving a source page whose
 * splitting is disabled.
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

  const isBooklet = settings.layoutMode === 'booklet';
  const split = !!settings.splitDoubleSpreads;
  const isPanoramic = (w: number, h: number) => w > h * 1.15;
  const dimOf = (idx: number) => sourcePDF.pages[idx] || { width: sourcePDF.firstPageWidth, height: sourcePDF.firstPageHeight };
  const halfParts = (): [PagePart, PagePart] =>
    settings.bindingEdge === 'right' ? ['right_half', 'left_half'] : ['left_half', 'right_half'];

  const list: VirtualPage[] = [];

  // 1. First Active Page = front-cover block (no early return: a single active
  // page goes through the same split logic so `splitDoubleSpreads` survives exclusions).
  const n = activePageIndices.length;
  const firstIdx = activePageIndices[0];
  const p0 = dimOf(firstIdx);
  const firstIsDouble = split && isPanoramic(p0.width, p0.height);

  if (!firstIsDouble) {
    list.push({ sourcePageIndex: firstIdx, part: 'full', width: p0.width, height: p0.height });
  } else {
    const [a, b] = halfParts();
    list.push({ sourcePageIndex: firstIdx, part: a, width: p0.width / 2, height: p0.height });
    list.push({ sourcePageIndex: firstIdx, part: b, width: p0.width / 2, height: p0.height });
  }
  const coverBlockLen = firstIsDouble ? 2 : 1;

  // 1b. Courtesy blank inside the front cover (booklet only), placed AFTER the
  // whole cover block so panoramic cover halves are never separated.
  if (isBooklet && settings.blankAfterFrontCover && list.length >= 1) {
    list.splice(coverBlockLen, 0, {
      sourcePageIndex: null,
      part: 'full',
      width: list[0].width,
      height: list[0].height,
      isSpacerBlank: true,
      spacerReason: 'front_cover_inside',
    });
  }

  // 2. Remaining Active Pages. In booklet mode every split double started here
  // must begin at an ODD 0-based index to sit on two facing pages; the parity
  // is checked before EACH split (an odd run of singles between doubles would
  // otherwise push the next double across a turn). The check runs at build time,
  // after the front blank above, so later insertions (which all happen at or
  // after the trailing block) cannot disturb interior parity.
  for (let k = 1; k < n; k++) {
    const pIdx = activePageIndices[k];
    const page = dimOf(pIdx);
    const isDouble = split && isPanoramic(page.width, page.height);

    if (!isDouble) {
      list.push({ sourcePageIndex: pIdx, part: 'full', width: page.width, height: page.height });
    } else {
      if (isBooklet && list.length % 2 === 0) {
        list.push({
          sourcePageIndex: null,
          part: 'full',
          width: page.width / 2,
          height: page.height,
          isSpacerBlank: true,
          spacerReason: 'spread_alignment_start',
        });
      }
      const [a, b] = halfParts();
      list.push({ sourcePageIndex: pIdx, part: a, width: page.width / 2, height: page.height });
      list.push({ sourcePageIndex: pIdx, part: b, width: page.width / 2, height: page.height });
    }
  }

  // 3. Courtesy blank inside the back cover (booklet only). It applies to a
  // SINGLE back cover: when the trailing block is a panoramic double, that
  // page is not a simple back cover (its halves form their own block), so no
  // blank is forced between its halves. Dimensions come from the trailing
  // virtual page, even when splitting is disabled.
  if (isBooklet && settings.blankBeforeBackCover && n > 1 && list.length > 0) {
    const last = list[list.length - 1];
    const prev = list.length >= 2 ? list[list.length - 2] : null;
    const trailingIsDouble =
      !!prev &&
      last.sourcePageIndex !== null &&
      last.sourcePageIndex === prev.sourcePageIndex &&
      last.part !== 'full' &&
      prev.part !== 'full';
    if (!trailingIsDouble) {
      const at = list.length - 1;
      list.splice(at, 0, {
        sourcePageIndex: null,
        part: 'full',
        width: last.width,
        height: last.height,
        isSpacerBlank: true,
        spacerReason: 'back_cover_inside',
      });
    }
  }

  return list;
}

/**
 * Finishing multiple for booklet signatures: 8 pages per french_fold sheet,
 * 4 pages per spread everywhere else.
 */
export function getBookletSignatureUnit(settings: ImpositionSettings): number {
  return (settings.booklet4UpMode || 'cut_and_nest') === 'french_fold' ? 8 : 4;
}

function makeSpacerBlanks(count: number, reason: SpacerReason, width: number, height: number): VirtualPage[] {
  const out: VirtualPage[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ sourcePageIndex: null, part: 'full', width, height, isSpacerBlank: true, spacerReason: reason });
  }
  return out;
}

/**
 * Splits booklet content pages (as returned by buildVirtualPageList, courtesy
 * blanks included, padding excluded) into per-signature local lists and pads
 * each signature to its finishing multiple BEFORE any page table is generated.
 *
 * - `signatureSize` counts CONTENT entries per signature (arbitrary positive
 *   integers allowed); each signature is then padded with `signature_padding`
 *   blanks, so callers never use `sigStart = sig * sigStep` over a padded list.
 * - Double-spread half pairs are never split across signatures.
 * - Padding goes BEFORE the back-cover block of each signature (before the
 *   `back_cover_inside` blank when present, else before the last page) so the
 *   real back cover stays exterior. Exception: a trailing panoramic double
 *   keeps its halves contiguous and facing, so pads are APPENDED after it.
 * All three booklet branches (french_fold, duplicate_2up, cut_and_nest) consume
 * these same prepared signatures.
 */
export function prepareBookletSignatures(
  content: VirtualPage[],
  settings: ImpositionSettings
): VirtualPage[][] {
  if (content.length === 0) return [];
  const unit = getBookletSignatureUnit(settings);
  const sigStep = settings.signatureSize > 0 ? settings.signatureSize : content.length;

  // Group content into atomic items: a split pair stays together, everything
  // else is a single item. Signatures are packed item by item.
  const items: VirtualPage[][] = [];
  for (let i = 0; i < content.length; i++) {
    const cur = content[i];
    const nxt = i + 1 < content.length ? content[i + 1] : null;
    if (
      nxt &&
      cur.sourcePageIndex !== null &&
      cur.sourcePageIndex === nxt.sourcePageIndex &&
      cur.part !== 'full' &&
      nxt.part !== 'full'
    ) {
      items.push([cur, nxt]);
      i++;
    } else {
      items.push([cur]);
    }
  }

  const chunks: VirtualPage[][] = [];
  let cur: VirtualPage[] = [];
  let curLen = 0;
  const flush = () => {
    if (cur.length > 0) chunks.push(cur);
    cur = [];
    curLen = 0;
  };
  for (const it of items) {
    if (sigStep > 0 && curLen + it.length > sigStep && curLen > 0) flush();
    cur.push(...it);
    curLen += it.length;
  }
  flush();

  return chunks.map((chunk) => {
    const pad = (unit - (chunk.length % unit)) % unit;
    if (pad === 0) return chunk;
    const out = [...chunk];
    const L = out.length;
    const last = out[L - 1];
    const prev = L >= 2 ? out[L - 2] : null;
    const trailingIsDouble =
      !!prev &&
      last.sourcePageIndex !== null &&
      last.sourcePageIndex === prev.sourcePageIndex &&
      last.part !== 'full' &&
      prev.part !== 'full';
    const blanks = makeSpacerBlanks(pad, 'signature_padding', last.width, last.height);
    if (trailingIsDouble) {
      // Keep the facing halves contiguous and odd-started: pad after them.
      out.push(...blanks);
    } else {
      // Pin the back cover exterior: pad before the back-cover block.
      let at = out.length - 1;
      const bi = out.findIndex((v) => v.spacerReason === 'back_cover_inside');
      if (bi !== -1) at = bi;
      out.splice(at, 0, ...blanks);
    }
    return out;
  });
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
    const w = settings.targetPageWidth;
    const h = settings.targetPageHeight;
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      throw new Error(`Invalid custom target page size: ${w} x ${h}`);
    }
    return {
      width: w,
      height: h,
      label: `Personalizado (${w} × ${h} mm)`,
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
 * Shared rotation decision between the optimizer and the placer: rotate the
 * page 90 deg exactly when the rotated orientation fits the cell better.
 * Both orientations already include `pageRotation`; booklet callers keep the
 * spine restriction by not offering rotation at all.
 */
export function shouldRotatePageToFit(
  cellW: number,
  cellH: number,
  effW: number,
  effH: number
): boolean {
  if (!(cellW > 0) || !(cellH > 0) || !(effW > 0) || !(effH > 0)) return false;
  const fit0 = Math.min(cellW / effW, cellH / effH);
  const fit90 = Math.min(cellW / effH, cellH / effW);
  return fit90 > fit0;
}

/**
 * Calculates how many target pages fit on the specified sheet size,
 * optimizing columns, rows, orientation, and maximizing sheet usage.
 *
 * Target states: `auto` (preset `auto` or the explicit `(0, 0)` sentinel)
 * reuses the current grid; any other target must be finite with both
 * dimensions > 0, otherwise it is rejected (never confused with `auto`).
 * A result with `totalFit: 0` is an explicit no-fit state: the returned grid
 * is topologically valid (even columns in booklet, 2x2 for french_fold) but
 * the caller must resolve it (e.g. scale down) before generating the plan.
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
  // Optimizer entry validation covers basic input values only (finite positive
  // sheets, finite non-negative margins/gutters). The CURRENT grid is NOT
  // validated here: it may be exactly what the caller wants replaced. Each
  // candidate is validated geometrically before comparison, and the `auto`
  // fallback below validates the reused grid explicitly.
  validateSheetBasics(settings, sheetW, sheetH);

  // Auto sentinel is the explicit (0, 0) (used with the `auto` preset).
  // Anything else must be a fully valid target size.
  if (targetW === 0 && targetH === 0) {
    validateImpositionInputs(settings, sheetW, sheetH);
    return {
      cols: settings.gridCols,
      rows: settings.gridRows,
      sheetOrientation: settings.sheetOrientation,
      autoRotate: settings.autoRotateToFit,
      totalFit: settings.gridCols * settings.gridRows,
      coveragePercent: 1,
    };
  }
  if (!Number.isFinite(targetW) || !Number.isFinite(targetH) || targetW <= 0 || targetH <= 0) {
    throw new Error(`Invalid target page size: ${targetW} x ${targetH}`);
  }

  const sheetMin = Math.min(sheetW, sheetH);
  const sheetMax = Math.max(sheetW, sheetH);

  const isClose = (a: number, b: number) => Math.abs(a - b) <= 2.5;
  const gutterH = Math.max(0, settings.gutterHorizontal || 0);
  const gutterV = Math.max(0, settings.gutterVertical || 0);
  const marginH = Math.max(0, settings.marginLeft || 0) + Math.max(0, settings.marginRight || 0);
  const marginV = Math.max(0, settings.marginTop || 0) + Math.max(0, settings.marginBottom || 0);

  // Exact-size fit count inside the usable area (margins discounted).
  const fitCount = (sW: number, sH: number, tW: number, tH: number): { cols: number; rows: number; total: number } => {
    const usableW = sW - marginH;
    const usableH = sH - marginV;
    if (tW <= 0 || tH <= 0 || usableW <= 0 || usableH <= 0) return { cols: 0, rows: 0, total: 0 };
    const cols = Math.floor((usableW + gutterH) / (tW + gutterH));
    const rows = Math.floor((usableH + gutterV) / (tH + gutterV));
    if (cols <= 0 || rows <= 0) return { cols: 0, rows: 0, total: 0 };
    return { cols, rows, total: cols * rows };
  };
  const coverageOf = (sW: number, sH: number, total: number): number => {
    if (total <= 0 || sW <= 0 || sH <= 0) return 0;
    return (total * targetW * targetH) / (sW * sH);
  };

  // Effective target dimensions include the manual `pageRotation` for every
  // mode (shared meaning with the placer, via isAngleLandscapeSwapping).
  const swapBase = isAngleLandscapeSwapping(settings.pageRotation);
  const baseTW = swapBase ? targetH : targetW;
  const baseTH = swapBase ? targetW : targetH;

  // Booklet layouts must keep the spine vertical: no isolated 90-degree
  // auto-rotation (the placer disables it). french_fold is additionally locked
  // to its 2x2 topology: the optimizer searches only inside it.
  if (settings.layoutMode === 'booklet' && (settings.booklet4UpMode || 'cut_and_nest') === 'french_fold') {
    const orientations: Array<'portrait' | 'landscape'> = ['landscape', 'portrait'];
    let best = {
      cols: 2,
      rows: 2,
      sheetOrientation: settings.sheetOrientation as 'portrait' | 'landscape',
      autoRotate: false,
      totalFit: 0,
      coveragePercent: 0,
    };
    for (const orient of orientations) {
      const sW = orient === 'landscape' ? sheetMax : sheetMin;
      const sH = orient === 'landscape' ? sheetMin : sheetMax;
      const f = fitCount(sW, sH, baseTW, baseTH);
      if (f.cols < 2 || f.rows < 2) continue;
      const cov = coverageOf(sW, sH, 4);
      if (4 > best.totalFit || (best.totalFit === 4 && cov > best.coveragePercent)) {
        best = { cols: 2, rows: 2, sheetOrientation: orient, autoRotate: false, totalFit: 4, coveragePercent: cov };
      }
    }
    // Explicit no-fit inside the 2x2 topology: valid grid, zero exact fits.
    return best;
  }

  if (settings.layoutMode === 'booklet') {
    const orientations: Array<'portrait' | 'landscape'> = ['landscape', 'portrait'];
    let best = {
      cols: 2,
      rows: 1,
      sheetOrientation: settings.sheetOrientation as 'portrait' | 'landscape',
      autoRotate: false,
      totalFit: 0,
      coveragePercent: 0,
    };
    for (const orient of orientations) {
      const sW = orient === 'landscape' ? sheetMax : sheetMin;
      const sH = orient === 'landscape' ? sheetMin : sheetMax;
      const f = fitCount(sW, sH, baseTW, baseTH);
      // The geometric maximum may be odd: floor to the usable even count
      // instead of discarding the whole orientation.
      const evenCols = f.cols - (f.cols % 2);
      if (evenCols < 2 || f.rows < 1) continue;
      const total = evenCols * f.rows;
      const cov = coverageOf(sW, sH, total);
      if (total > best.totalFit || (total === best.totalFit && cov > best.coveragePercent)) {
        best = { cols: evenCols, rows: f.rows, sheetOrientation: orient, autoRotate: false, totalFit: total, coveragePercent: cov };
      }
    }
    // No exact-size fit: return a valid booklet grid but signal zero exact fits
    // so callers must reduce/scale instead of printing an oversized page.
    return best;
  }

  interface SpecialPreset {
    sheetMin: number;
    sheetMax: number;
    targetMin: number;
    targetMax: number;
    cols: number;
    rows: number;
    sheetOrientation: 'portrait' | 'landscape';
    autoRotate: boolean;
  }
  const specials: SpecialPreset[] = [
    { sheetMin: 210, sheetMax: 297, targetMin: 148.5, targetMax: 210, cols: 2, rows: 1, sheetOrientation: 'landscape', autoRotate: false },
    { sheetMin: 210, sheetMax: 297, targetMin: 105, targetMax: 148.5, cols: 2, rows: 2, sheetOrientation: 'landscape', autoRotate: true },
    { sheetMin: 210, sheetMax: 297, targetMin: 74, targetMax: 105, cols: 4, rows: 2, sheetOrientation: 'landscape', autoRotate: false },
    { sheetMin: 210, sheetMax: 297, targetMin: 52, targetMax: 74, cols: 4, rows: 4, sheetOrientation: 'landscape', autoRotate: true },
    { sheetMin: 210, sheetMax: 297, targetMin: 50, targetMax: 90, cols: 3, rows: 4, sheetOrientation: 'landscape', autoRotate: false },
    { sheetMin: 210, sheetMax: 297, targetMin: 55, targetMax: 85, cols: 5, rows: 2, sheetOrientation: 'landscape', autoRotate: true },
    { sheetMin: 297, sheetMax: 420, targetMin: 210, targetMax: 297, cols: 2, rows: 1, sheetOrientation: 'landscape', autoRotate: false },
    { sheetMin: 297, sheetMax: 420, targetMin: 148.5, targetMax: 210, cols: 2, rows: 2, sheetOrientation: 'landscape', autoRotate: true },
    { sheetMin: 297, sheetMax: 420, targetMin: 105, targetMax: 148.5, cols: 4, rows: 2, sheetOrientation: 'landscape', autoRotate: false },
    { sheetMin: 297, sheetMax: 420, targetMin: 74, targetMax: 105, cols: 4, rows: 4, sheetOrientation: 'landscape', autoRotate: true },
    { sheetMin: 215.9, sheetMax: 279.4, targetMin: 139.7, targetMax: 215.9, cols: 2, rows: 1, sheetOrientation: 'landscape', autoRotate: false },
  ];

  const targetMin = Math.min(targetW, targetH);
  const targetMax = Math.max(targetW, targetH);
  for (const sp of specials) {
    if (!(isClose(sheetMin, sp.sheetMin) && isClose(sheetMax, sp.sheetMax))) continue;
    if (!(isClose(targetMin, sp.targetMin) && isClose(targetMax, sp.targetMax))) continue;
    const sW = sp.sheetOrientation === 'landscape' ? sheetMax : sheetMin;
    const sH = sp.sheetOrientation === 'landscape' ? sheetMin : sheetMax;
    const tW = sp.autoRotate ? baseTH : baseTW;
    const tH = sp.autoRotate ? baseTW : baseTH;
    // Validate against the usable area; a swapped target orientation is also
    // accepted when it is the one that actually fits.
    const direct = fitCount(sW, sH, tW, tH);
    const swapped = fitCount(sW, sH, tH, tW);
    const fitsDirect = direct.cols >= sp.cols && direct.rows >= sp.rows;
    const fitsSwapped = swapped.cols >= sp.cols && swapped.rows >= sp.rows;
    if (!fitsDirect && !fitsSwapped) continue;
    const useSwapped = !fitsDirect && fitsSwapped;
    const total = sp.cols * sp.rows;
    return {
      cols: sp.cols,
      rows: sp.rows,
      sheetOrientation: sp.sheetOrientation,
      autoRotate: useSwapped ? !sp.autoRotate : sp.autoRotate,
      totalFit: total,
      coveragePercent: coverageOf(sW, sH, total),
    };
  }

  // General algorithm for any sheet or target dimensions:
  // Both sheet orientations and unrotated/rotated target orientations are
  // evaluated inside the usable area (margins/gutters discounted). No 1.02
  // overshoot and no forced minimum of one exact-size page.
  const orientations: Array<'portrait' | 'landscape'> = ['landscape', 'portrait'];
  let best = {
    cols: 1,
    rows: 1,
    sheetOrientation: settings.sheetOrientation as 'portrait' | 'landscape',
    autoRotate: false,
    totalFit: 0,
    coveragePercent: 0,
  };

  for (const orient of orientations) {
    const sW = orient === 'landscape' ? sheetMax : sheetMin;
    const sH = orient === 'landscape' ? sheetMin : sheetMax;

    // Candidate 1: Target unrotated (effective base orientation, pageRotation applied)
    const f1 = fitCount(sW, sH, baseTW, baseTH);
    if (f1.total > 0) {
      const cov1 = coverageOf(sW, sH, f1.total);
      if (f1.total > best.totalFit || (f1.total === best.totalFit && cov1 > best.coveragePercent)) {
        best = {
          cols: f1.cols,
          rows: f1.rows,
          sheetOrientation: orient,
          autoRotate: false,
          totalFit: f1.total,
          coveragePercent: cov1,
        };
      }
    }

    // Candidate 2: Target rotated 90 deg (effective base orientation swapped)
    const f2 = fitCount(sW, sH, baseTH, baseTW);
    if (f2.total > 0) {
      const cov2 = coverageOf(sW, sH, f2.total);
      if (f2.total > best.totalFit || (f2.total === best.totalFit && cov2 > best.coveragePercent)) {
        best = {
          cols: f2.cols,
          rows: f2.rows,
          sheetOrientation: orient,
          autoRotate: true,
          totalFit: f2.total,
          coveragePercent: cov2,
        };
      }
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
 * Long/short edge refer to the physical sheet, not fixed screen axes:
 * a long-edge turn mirrors columns on portrait sheets but rows on landscape
 * sheets; a short-edge turn does the opposite.
 */
export function isBackSideHorizontallyMirrored(settings: ImpositionSettings): boolean {
  // Explicit back faces in sheetwise/manual printing use a book turn by default.
  if (settings.duplexMode === 'simplex') return true;

  const { width, height } = getEffectiveSheetDimensions(settings);
  const isPortrait = height >= width;
  // Portrait: long_edge = vertical (book) axis -> mirror columns.
  // Landscape: short_edge = vertical axis -> mirror columns.
  return isPortrait
    ? settings.duplexMode === 'long_edge'
    : settings.duplexMode === 'short_edge';
}

/**
 * Converts the complete front-facing orientation to the back-facing orientation.
 */
function calculateBackSideRotation(
  frontRotation: number,
  settings: ImpositionSettings
): 0 | 90 | 180 | 270 {
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
  // In booklet mode, spreads are paired horizontally [Left | Right] across facing columns.
  // Automatically rotating individual cells by 90 degrees breaks the spine orientation
  // (the spine moves to the top/bottom horizontal edge while the fold line remains vertical).
  // Therefore, autoRotateToFit is disabled in booklet mode to guarantee the spine is on the fold line.
  if (settings.autoRotateToFit && settings.layoutMode !== 'booklet') {
    const isSwapped = isAngleLandscapeSwapping(baseRotation);
    const effW = isSwapped ? sourcePageHeight : sourcePageWidth;
    const effH = isSwapped ? sourcePageWidth : sourcePageHeight;

    // Shared decision with the optimizer: rotate exactly when the rotated
    // orientation fits this cell better (works for near-square proportions
    // where aspect thresholds would refuse a useful rotation).
    if (shouldRotatePageToFit(cellWidth, cellHeight, effW, effH)) {
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
 * Basic sheet/input validation for the optimizer entry: finite positive sheet
 * dimensions and finite non-negative margins/gutters. It deliberately does NOT
 * check the current grid (which the optimizer may be about to replace) nor the
 * usable area of any particular grid; candidates are checked geometrically.
 */
function validateSheetBasics(
  settings: ImpositionSettings,
  sheetW: number,
  sheetH: number
): void {
  const fail = (msg: string): never => {
    throw new Error(msg);
  };
  if (!Number.isFinite(sheetW) || sheetW <= 0) fail(`Invalid sheet width: ${sheetW}`);
  if (!Number.isFinite(sheetH) || sheetH <= 0) fail(`Invalid sheet height: ${sheetH}`);
  for (const [name, v] of [
    ['marginLeft', settings.marginLeft],
    ['marginRight', settings.marginRight],
    ['marginTop', settings.marginTop],
    ['marginBottom', settings.marginBottom],
    ['gutterHorizontal', settings.gutterHorizontal],
    ['gutterVertical', settings.gutterVertical],
  ] as const) {
    if (!Number.isFinite(v) || v < 0) fail(`Invalid ${name}: ${v}`);
  }
  if (!Number.isInteger(settings.signatureSize) || !Number.isFinite(settings.signatureSize) || settings.signatureSize < 0) {
    fail(`Invalid signatureSize: ${settings.signatureSize}`);
  }
}

/**
 * Validates grid geometry and sheet limits shared by the planner and the optimizer.
 * Rejects invalid entries instead of hiding them with clamping or fallbacks.
 */
function validateImpositionInputs(
  settings: ImpositionSettings,
  sheetW: number,
  sheetH: number
): void {
  const fail = (msg: string): never => {
    throw new Error(msg);
  };
  if (!Number.isFinite(sheetW) || sheetW <= 0) fail(`Invalid sheet width: ${sheetW}`);
  if (!Number.isFinite(sheetH) || sheetH <= 0) fail(`Invalid sheet height: ${sheetH}`);
  if (!Number.isInteger(settings.gridCols) || !Number.isFinite(settings.gridCols) || settings.gridCols < 1) {
    fail(`Invalid gridCols: ${settings.gridCols}`);
  }
  if (!Number.isInteger(settings.gridRows) || !Number.isFinite(settings.gridRows) || settings.gridRows < 1) {
    fail(`Invalid gridRows: ${settings.gridRows}`);
  }
  if (settings.layoutMode === 'booklet') {
    if (settings.gridCols < 2 || settings.gridCols % 2 === 1) {
      fail(`Booklet mode requires an even gridCols >= 2 (got ${settings.gridCols})`);
    }
  }
  if (!Number.isInteger(settings.signatureSize) || !Number.isFinite(settings.signatureSize) || settings.signatureSize < 0) {
    fail(`Invalid signatureSize: ${settings.signatureSize}`);
  }
  for (const [name, v] of [
    ['marginLeft', settings.marginLeft],
    ['marginRight', settings.marginRight],
    ['marginTop', settings.marginTop],
    ['marginBottom', settings.marginBottom],
    ['gutterHorizontal', settings.gutterHorizontal],
    ['gutterVertical', settings.gutterVertical],
  ] as const) {
    if (!Number.isFinite(v) || v < 0) fail(`Invalid ${name}: ${v}`);
  }
  const cols = settings.gridCols;
  const rows = settings.gridRows;
  const usableW = sheetW - settings.marginLeft - settings.marginRight - (cols - 1) * settings.gutterHorizontal;
  const usableH = sheetH - settings.marginTop - settings.marginBottom - (rows - 1) * settings.gutterVertical;
  if (!(usableW > 0) || !(usableH > 0)) {
    fail(`Unusable sheet area: margins/gutters leave ${usableW.toFixed(2)} x ${usableH.toFixed(2)} mm`);
  }
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

  {
    const { width: _vw, height: _vh } = getEffectiveSheetDimensions(settings);
    validateImpositionInputs(settings, _vw, _vh);
  }
  if (settings.layoutMode === 'booklet' && settings.duplexMode === 'simplex') {
    throw new Error('Booklet imposition requires duplex printing: fronts and backs are both needed; simplex would silently drop half the pages.');
  }
  if (settings.layoutMode === 'booklet' && (settings.booklet4UpMode || 'cut_and_nest') === 'french_fold') {
    if (settings.gridCols !== 2 || settings.gridRows !== 2) {
      throw new Error('french_fold is only defined for a 2x2 grid; refusing to silently fall back to cut_and_nest.');
    }
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
      c = settings.gridCols - 1 - c;
      r = settings.gridRows - 1 - r;
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

  // Entry-based cell builder for prepared per-signature lists. Null renders an
  // empty (non-blank) cell; spacer blanks keep their reason.
  const createCellFromEntry = (
    c: number,
    r: number,
    entry: VirtualPage | null,
    cellW: number,
    cellH: number,
    marginLeft: number,
    marginTop: number,
    gutterH: number,
    gutterV: number,
    isBackSide: boolean,
    extraRotation: number = 0
  ): ImpositionCell => {
    let cc = c;
    let rr = r;
    if (isBackSide && settings.layoutMode === 'booklet' && !mirrorBackHorizontally) {
      cc = settings.gridCols - 1 - cc;
      rr = settings.gridRows - 1 - rr;
    }
    const x = marginLeft + cc * (cellW + gutterH);
    const y = marginTop + rr * (cellH + gutterV);
    const dims = entry ? { w: entry.width, h: entry.height } : { w: cellW, h: cellH };
    const placement = calculateCellPlacement(cellW, cellH, dims.w, dims.h, settings, false);
    const naturalRotation = normalizeRotation(placement.rotate + extraRotation);
    const finalRot = isBackSide
      ? calculateBackSideRotation(naturalRotation, settings)
      : naturalRotation;
    return {
      colIndex: cc,
      rowIndex: rr,
      sourcePageIndex: entry && entry.sourcePageIndex !== null ? entry.sourcePageIndex : null,
      pagePart: entry?.part ?? 'full',
      isSpacerBlank: entry?.isSpacerBlank ?? false,
      spacerReason: entry?.spacerReason,
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
    // Inputs already validated: gridCols is an even integer >= 2, gridRows >= 1,
    // and the usable area is strictly positive. No clamping here.
    const cols = settings.gridCols;
    const rows = settings.gridRows;
    const spreadCols = Math.floor(cols / 2);
    const spreadsPerSheet = spreadCols * rows;
    const pagesPerSheet = 4 * spreadsPerSheet; // e.g. 2 cols x 2 rows = 8 pages/sheet

    const availW = sheetW - settings.marginLeft - settings.marginRight - (cols - 1) * settings.gutterHorizontal;
    const availH = sheetH - settings.marginTop - settings.marginBottom - (rows - 1) * settings.gutterVertical;
    const bCellW = availW / cols;
    const bCellH = availH / rows;

    // Mirror margins on the same physical axis used for positions and rotation.
    const backMarginLeft = mirrorBackHorizontally ? settings.marginRight : settings.marginLeft;
    const backMarginTop = mirrorBackHorizontally ? settings.marginTop : settings.marginBottom;

    const booklet4Up = settings.booklet4UpMode || 'cut_and_nest';

    let globalSheetNumber = 1;

    // French fold: only defined for the hardwired 2x2 eight-page table. Any other
    // grid was rejected upfront; larger signatures are nested as ONE folded
    // signature (outer/inner sheets computed against the whole padded signature).
    const isFrenchFoldGrid = cols === 2 && rows === 2;
    if (spreadsPerSheet >= 2 && booklet4Up === 'french_fold' && isFrenchFoldGrid) {
      // All french_fold signatures share one prepared pipeline: content is
      // chunked per signatureSize and each signature is padded to a multiple
      // of 8 BEFORE its table is generated, with pads before the back-cover
      // block — so the back cover always ends the (padded) signature.
      const signatures = prepareBookletSignatures(virtualPages, settings);

      for (const sig of signatures) {
        const N = sig.length;
        const sigSheets = N / 8;

        for (let s = 0; s < sigSheets; s++) {
          // Relative indices against the whole padded signature so sheet 0 of a
          // 16/32-page signature receives the outermost pages (incl. the last).
          // For N=8 this reduces to [0..7], preserving the classic table.
          const rel = [
            2 * s,
            2 * s + 1,
            N / 2 - 2 * s - 2,
            N / 2 - 2 * s - 1,
            N / 2 + 2 * s,
            N / 2 + 2 * s + 1,
            N - 2 * s - 2,
            N - 2 * s - 1,
          ];
          const getEntry = (slot: number): VirtualPage | null => {
            const r = rel[slot];
            if (r < 0 || r >= N) return null;
            return sig[r] ?? null;
          };

          // 8-page French fold signature (Top row is rotated 180 head-to-head)
          const p1 = getEntry(0);
          const p2 = getEntry(1);
          const p3 = getEntry(2);
          const p4 = getEntry(3);
          const p5 = getEntry(4);
          const p6 = getEntry(5);
          const p7 = getEntry(6);
          const p8 = getEntry(7);

          // Front side:
          // Row 0: P5 (rot 180), P4 (rot 180)
          // Row 1: P8, P1
          const frontCells: ImpositionCell[] = [
            createCellFromEntry(0, 0, settings.bindingEdge === 'right' ? p4 : p5, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false, 180),
            createCellFromEntry(1, 0, settings.bindingEdge === 'right' ? p5 : p4, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false, 180),
            createCellFromEntry(0, 1, settings.bindingEdge === 'right' ? p1 : p8, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false, 0),
            createCellFromEntry(1, 1, settings.bindingEdge === 'right' ? p8 : p1, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false, 0),
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
              createCellFromEntry(0, 0, settings.bindingEdge === 'right' ? p6 : p3, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true, 180),
              createCellFromEntry(1, 0, settings.bindingEdge === 'right' ? p3 : p6, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true, 180),
              createCellFromEntry(0, 1, settings.bindingEdge === 'right' ? p7 : p2, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true, 0),
              createCellFromEntry(1, 1, settings.bindingEdge === 'right' ? p2 : p7, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true, 0),
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
      const signatures = prepareBookletSignatures(virtualPages, settings);

      for (const sig of signatures) {
        const N = sig.length;
        const sigSheets = N / 4;

        for (let s = 0; s < sigSheets; s++) {
          const at = (r: number): VirtualPage | null => (r < 0 || r >= N ? null : sig[r] ?? null);
          const flEntry = at(N - 2 * s - 1);
          const frEntry = at(2 * s);

          let col0Front = flEntry;
          let col1Front = frEntry;
          if (settings.bindingEdge === 'right') {
            col0Front = frEntry;
            col1Front = flEntry;
          }

          const frontCells: ImpositionCell[] = [];
          for (let r = 0; r < rows; r++) {
            for (let sc = 0; sc < spreadCols; sc++) {
              frontCells.push(
                createCellFromEntry(sc * 2, r, col0Front, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false),
                createCellFromEntry(sc * 2 + 1, r, col1Front, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
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
            const blEntry = at(2 * s + 1);
            const brEntry = at(N - 2 * s - 2);

            let col0Back = blEntry;
            let col1Back = brEntry;
            if (settings.bindingEdge === 'right') {
              col0Back = brEntry;
              col1Back = blEntry;
            }

            // Identical copies use the same natural booklet reverse; createCellFromEntry
            // converts both position and orientation for the selected turn axis.
            const backCells: ImpositionCell[] = [];
            for (let r = 0; r < rows; r++) {
              for (let sc = 0; sc < spreadCols; sc++) {
                backCells.push(
                  createCellFromEntry(sc * 2, r, col0Back, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true),
                  createCellFromEntry(sc * 2 + 1, r, col1Back, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
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
      frontCol0: VirtualPage | null;
      frontCol1: VirtualPage | null;
      backCol0: VirtualPage | null;
      backCol1: VirtualPage | null;
      sigIndex: number;
    }

    // Shared prepared signatures: content chunked per signatureSize (arbitrary
    // sizes allowed) and padded per signature to a multiple of 4, pads before
    // the back-cover block. No sigStart arithmetic over a padded list.
    const prepared = prepareBookletSignatures(virtualPages, settings);

    // Build all signatures and their spreads from local (already padded) lists.
    const allSignatures: Array<{ sigIndex: number; pages: VirtualPage[]; spreads: BookletSpreadPages[] }> = [];

    for (let sig = 0; sig < prepared.length; sig++) {
      const pages = prepared[sig];
      const sigSpreads = pages.length / 4;

      const spreads: BookletSpreadPages[] = [];
      for (let sp = 0; sp < sigSpreads; sp++) {
        const eFL = pages[pages.length - 1 - 2 * sp] ?? null;
        const eFR = pages[2 * sp] ?? null;
        const eBL = pages[2 * sp + 1] ?? null;
        const eBR = pages[pages.length - 2 - 2 * sp] ?? null;

        spreads.push({
          frontCol0: settings.bindingEdge === 'right' ? eFR : eFL,
          frontCol1: settings.bindingEdge === 'right' ? eFL : eFR,
          backCol0: settings.bindingEdge === 'right' ? eBR : eBL,
          backCol1: settings.bindingEdge === 'right' ? eBL : eBR,
          sigIndex: sig,
        });
      }

      allSignatures.push({ sigIndex: sig, pages, spreads });
    }

    const firstSigSpreads = allSignatures[0]?.spreads.length || 1;
    const firstSigFinalPages = allSignatures[0]?.pages.length ?? settings.signatureSize;

    // Check if each signature has fewer spreads than fit on one physical sheet
    // e.g. signatureSize = 4 (1 spread), but 2x2 sheet holds 2 spreads (spreadsPerSheet = 2)
    if (firstSigSpreads < spreadsPerSheet && settings.signatureSize > 0) {
      // MULTIPLE SIGNATURES PER SHEET
      const sigsPerSheet = Math.max(1, Math.floor(spreadsPerSheet / firstSigSpreads));
      const totalSignatures = allSignatures.length;

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
              createCellFromEntry(sc * 2, r, spread?.frontCol0 ?? null, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false),
              createCellFromEntry(sc * 2 + 1, r, spread?.frontCol1 ?? null, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
            );

            backCells.push(
              createCellFromEntry(backSc * 2, r, spread?.backCol0 ?? null, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true),
              createCellFromEntry(backSc * 2 + 1, r, spread?.backCol1 ?? null, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
            );
          }
        }

        const isMultiSpread = spreadsPerSheet > 1;
        sheets.push({
          sheetIndex: sheets.length,
          sheetNumber: globalSheetNumber,
          side: 'front',
          label: isMultiSpread
            ? `${L.sheet} ${globalSheetNumber} · ${L.front} (${fill(L.signaturesOf, { n: sigsPerSheet, m: firstSigFinalPages })})`
            : `${L.sheet} ${globalSheetNumber} · ${L.front} (${L.pressFront})`,
          cells: frontCells,
        });

        if (settings.duplexMode !== 'simplex') {
          sheets.push({
            sheetIndex: sheets.length,
            sheetNumber: globalSheetNumber,
            side: 'back',
            label: isMultiSpread
              ? `${L.sheet} ${globalSheetNumber} · ${L.back} (${fill(L.signaturesOf, { n: sigsPerSheet, m: firstSigFinalPages })})`
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
              createCellFromEntry(sc * 2, r, spread?.frontCol0 ?? null, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false),
              createCellFromEntry(sc * 2 + 1, r, spread?.frontCol1 ?? null, bCellW, bCellH, settings.marginLeft, settings.marginTop, settings.gutterHorizontal, settings.gutterVertical, false)
            );

            backCells.push(
              createCellFromEntry(backSc * 2, r, spread?.backCol0 ?? null, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true),
              createCellFromEntry(backSc * 2 + 1, r, spread?.backCol1 ?? null, bCellW, bCellH, backMarginLeft, backMarginTop, settings.gutterHorizontal, settings.gutterVertical, true)
            );
          }

          const isMultiSpread = spreadsPerSheet > 1;
          // Label counts signature pages (spreads x 4), not face slots.
          const sigPages = sigObj.spreads.length * 4;
          sheets.push({
            sheetIndex: sheets.length,
            sheetNumber: globalSheetNumber,
            side: 'front',
            label: isMultiSpread
              ? `${L.sheet} ${globalSheetNumber} · ${L.front} (${fill(L.bookletCutNest, { n: sigPages })})`
              : `${L.sheet} ${globalSheetNumber} · ${L.front} (${L.pressFront})`,
            cells: frontCells,
          });

          if (settings.duplexMode !== 'simplex') {
            sheets.push({
              sheetIndex: sheets.length,
              sheetNumber: globalSheetNumber,
              side: 'back',
              label: isMultiSpread
                ? `${L.sheet} ${globalSheetNumber} · ${L.back} (${fill(L.bookletCutNest, { n: sigPages })})`
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
  // Validated above: cols/rows are finite integers >= 1 and the usable area is
  // strictly positive, so no clamping that would hide impossible geometry.
  const cols = settings.gridCols;
  const rows = settings.gridRows;
  const slotsPerSheet = cols * rows;

  const availW = sheetW - settings.marginLeft - settings.marginRight - (cols - 1) * settings.gutterHorizontal;
  const availH = sheetH - settings.marginTop - settings.marginBottom - (rows - 1) * settings.gutterVertical;
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