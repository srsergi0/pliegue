import { ImpositionSettings, ImposedSheet, PagePart } from '../../types';

export interface MarginBox {
  l: number;
  r: number;
  t: number;
  b: number;
}

export interface VerticalSeam {
  xPct: number;
  isFold: boolean;
  label: string;
}

export interface HorizontalSeam {
  yPct: number;
  isFold: boolean;
  label: string;
}

export interface SeamLines {
  verticalLines: VerticalSeam[];
  horizontalLines: HorizontalSeam[];
}

export interface PageLabelStrings {
  pageAbbr: string;
  leftHalf: string;
  rightHalf: string;
  courtesy: string;
  blank: string;
}

export interface CourtesyStrings {
  courtesyAlign: string;
  courtesyFrontCover: string;
  courtesyBackCover: string;
  courtesyPadding: string;
  courtesyDefault: string;
}

export interface HeadStrings {
  headUp: string;
  headRight: string;
  headDown: string;
  headLeft: string;
}

export interface SeamStrings {
  spineFold: string;
  guillotineCut: string;
  crossFold: string;
}

/**
 * Resolves the effective margins for a given sheet side. The back face is
 * mirrored on the same physical turn axis the planner uses
 * (isBackSideHorizontallyMirrored passed in as `mirrorBack`), which depends on
 * the sheet orientation, not only on the duplex mode.
 */
export function resolveMargins(
  settings: ImpositionSettings,
  side: 'front' | 'back' | 'single' | undefined,
  mirrorBack: boolean
): MarginBox {
  if (side !== 'back') {
    return { l: settings.marginLeft, r: settings.marginRight, t: settings.marginTop, b: settings.marginBottom };
  }
  return mirrorBack
    ? { l: settings.marginRight, r: settings.marginLeft, t: settings.marginTop, b: settings.marginBottom }
    : { l: settings.marginLeft, r: settings.marginRight, t: settings.marginBottom, b: settings.marginTop };
}

/**
 * Calculates the mathematically exact fold and cut lines derived from actual
 * cell coordinates for booklet layouts.
 */
export function computeBookletSeamLines(
  activeSheet: ImposedSheet | undefined,
  settings: ImpositionSettings,
  sheetW: number,
  sheetH: number,
  strings: SeamStrings
): SeamLines {
  if (settings.layoutMode !== 'booklet' || !activeSheet || activeSheet.cells.length === 0) {
    return { verticalLines: [], horizontalLines: [] };
  }

  const verticalLines: VerticalSeam[] = [];
  const horizontalLines: HorizontalSeam[] = [];

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
        label: isFold ? strings.spineFold : strings.guillotineCut,
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
        label: isFrenchFold ? strings.crossFold : strings.guillotineCut,
      });
    }
  }

  return { verticalLines, horizontalLines };
}

/** Builds a page badge label (Pág. N, halves, courtesy / blank). */
export function pageLabelFor(
  strings: PageLabelStrings,
  sourcePageIndex: number | null,
  pagePart: PagePart | undefined,
  isSpacerBlank: boolean | undefined
): string {
  let label = sourcePageIndex !== null
    ? `${strings.pageAbbr} ${sourcePageIndex + 1}`
    : isSpacerBlank ? strings.courtesy : strings.blank;
  if (pagePart === 'left_half') {
    label += strings.leftHalf;
  } else if (pagePart === 'right_half') {
    label += strings.rightHalf;
  }
  return label;
}

/** Human readable label for a spacer/courtesy blank reason. */
export function courtesyLabelFor(strings: CourtesyStrings, spacerReason: string | undefined): string {
  if (spacerReason === 'spread_alignment_start') return strings.courtesyAlign;
  if (spacerReason === 'front_cover_inside') return strings.courtesyFrontCover;
  if (spacerReason === 'back_cover_inside') return strings.courtesyBackCover;
  if (spacerReason === 'signature_padding') return strings.courtesyPadding;
  return strings.courtesyDefault;
}

/** Visual head label and arrow depending on cell rotation. */
export function getHeadIndicator(
  strings: HeadStrings,
  angle: number
): { arrow: string; label: string } {
  if (angle === 0) return { arrow: '▲', label: strings.headUp };
  if (angle === 90) return { arrow: '►', label: strings.headRight };
  if (angle === 180) return { arrow: '▼', label: strings.headDown };
  return { arrow: '◄', label: strings.headLeft };
}
