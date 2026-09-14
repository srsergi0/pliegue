import { PDFDocument, rgb, degrees, PDFPage, PDFEmbeddedPage } from 'pdf-lib';
import { ImpositionSettings, ImposedSheet, ImpositionCell } from '../types';
import { getEffectiveSheetDimensions } from './imposition';

const MM_TO_PT = 72 / 25.4; // 1 mm ~ 2.834645 points

/**
 * Draws corner crosshair crop marks (marcas de corte) for an imposition cell.
 */
function drawCellCropMarks(
  sheet: PDFPage,
  cell: ImpositionCell,
  sheetHMm: number,
  markLenMm: number,
  bleedMm: number
) {
  const lineW = 0.5;
  const markColor = rgb(0.1, 0.1, 0.1);
  const markLenPt = markLenMm * MM_TO_PT;
  const bleedPt = bleedMm * MM_TO_PT;

  const leftPt = cell.x * MM_TO_PT;
  const rightPt = (cell.x + cell.width) * MM_TO_PT;
  const topPt = (sheetHMm - cell.y) * MM_TO_PT;
  const bottomPt = (sheetHMm - (cell.y + cell.height)) * MM_TO_PT;

  // Top-left corner
  sheet.drawLine({
    start: { x: leftPt, y: topPt + bleedPt },
    end: { x: leftPt, y: topPt + bleedPt + markLenPt },
    thickness: lineW,
    color: markColor,
  });
  sheet.drawLine({
    start: { x: leftPt - bleedPt, y: topPt },
    end: { x: leftPt - bleedPt - markLenPt, y: topPt },
    thickness: lineW,
    color: markColor,
  });

  // Top-right corner
  sheet.drawLine({
    start: { x: rightPt, y: topPt + bleedPt },
    end: { x: rightPt, y: topPt + bleedPt + markLenPt },
    thickness: lineW,
    color: markColor,
  });
  sheet.drawLine({
    start: { x: rightPt + bleedPt, y: topPt },
    end: { x: rightPt + bleedPt + markLenPt, y: topPt },
    thickness: lineW,
    color: markColor,
  });

  // Bottom-left corner
  sheet.drawLine({
    start: { x: leftPt, y: bottomPt - bleedPt },
    end: { x: leftPt, y: bottomPt - bleedPt - markLenPt },
    thickness: lineW,
    color: markColor,
  });
  sheet.drawLine({
    start: { x: leftPt - bleedPt, y: bottomPt },
    end: { x: leftPt - bleedPt - markLenPt, y: bottomPt },
    thickness: lineW,
    color: markColor,
  });

  // Bottom-right corner
  sheet.drawLine({
    start: { x: rightPt, y: bottomPt - bleedPt },
    end: { x: rightPt, y: bottomPt - bleedPt - markLenPt },
    thickness: lineW,
    color: markColor,
  });
  sheet.drawLine({
    start: { x: rightPt + bleedPt, y: bottomPt },
    end: { x: rightPt + bleedPt + markLenPt, y: bottomPt },
    thickness: lineW,
    color: markColor,
  });
}

/**
 * Generates the imposed PDF document using pdf-lib.
 * Returns the raw PDF bytes (Uint8Array).
 */
export async function generateImposedPDF(
  sourcePdfBytes: Uint8Array,
  sheets: ImposedSheet[],
  settings: ImpositionSettings
): Promise<Uint8Array> {
  if (!sourcePdfBytes || sourcePdfBytes.byteLength === 0) {
    throw new Error("El archivo PDF original está vacío o no es válido.");
  }

  // Load document with fast non-blocking parsing and no metadata modification
  const srcDoc = await PDFDocument.load(sourcePdfBytes, {
    ignoreEncryption: true,
    parseSpeed: Infinity,
    updateMetadata: false,
  });
  const outDoc = await PDFDocument.create();

  const totalCells = sheets.reduce((n, s) => n + s.cells.length, 0);
  console.log(
    `[Pliegue] export: source=${(sourcePdfBytes.byteLength / 1048576).toFixed(1)}MB ` +
    `sheets=${sheets.length} cells=${totalCells}`
  );

  const { width: sheetWMm, height: sheetHMm } = getEffectiveSheetDimensions(settings);
  const sheetWPt = sheetWMm * MM_TO_PT;
  const sheetHPt = sheetHMm * MM_TO_PT;
  const totalSrcPages = srcDoc.getPageCount();

  // 1. Pre-scan all sheets to collect all unique (sourcePageIndex, pagePart) needed.
  const neededMap = new Map<string, { pageIndex: number; part: 'full' | 'left_half' | 'right_half' }>();
  for (const sheet of sheets) {
    for (const cell of sheet.cells) {
      if (
        cell.sourcePageIndex !== null &&
        cell.sourcePageIndex >= 0 &&
        cell.sourcePageIndex < totalSrcPages
      ) {
        const part = cell.pagePart || 'full';
        const key = `${cell.sourcePageIndex}_${part}`;
        if (!neededMap.has(key)) {
          neededMap.set(key, { pageIndex: cell.sourcePageIndex, part });
        }
      }
    }
  }

  // 2. Batch-embed all needed pages in a SINGLE outDoc.embedPages(...) call.
  // Crucial: A single call to embedPages shares one PDFObjectCopier, which ensures
  // all shared fonts, images, ICC profiles, and streams are deduplicated and copied
  // ONLY ONCE into outDoc, avoiding catastrophic memory explosion.
  const pagesToEmbed: PDFPage[] = [];
  const boxesToEmbed: (any)[] = [];
  const keysToEmbed: string[] = [];

  for (const [key, { pageIndex, part }] of neededMap.entries()) {
    const srcPage = srcDoc.getPage(pageIndex);
    const origAngle = srcPage.getRotation().angle || 0;
    const srcWPt = srcPage.getWidth();
    const srcHPt = srcPage.getHeight();
    const isSplit = part === 'left_half' || part === 'right_half';

    let box: any = undefined;
    if (isSplit) {
      if (origAngle === 0) {
        box = part === 'left_half'
          ? { left: 0, bottom: 0, right: srcWPt / 2, top: srcHPt }
          : { left: srcWPt / 2, bottom: 0, right: srcWPt, top: srcHPt };
      } else if (origAngle === 90) {
        box = part === 'left_half'
          ? { left: 0, bottom: srcHPt / 2, right: srcWPt, top: srcHPt }
          : { left: 0, bottom: 0, right: srcWPt, top: srcHPt / 2 };
      } else if (origAngle === 180) {
        box = part === 'left_half'
          ? { left: srcWPt / 2, bottom: 0, right: srcWPt, top: srcHPt }
          : { left: 0, bottom: 0, right: srcWPt / 2, top: srcHPt };
      } else if (origAngle === 270) {
        box = part === 'left_half'
          ? { left: 0, bottom: 0, right: srcWPt, top: srcHPt / 2 }
          : { left: 0, bottom: srcHPt / 2, right: srcWPt, top: srcHPt };
      }
    }

    pagesToEmbed.push(srcPage);
    boxesToEmbed.push(box);
    keysToEmbed.push(key);
  }

  const embeddedPagesList = pagesToEmbed.length > 0
    ? await outDoc.embedPages(pagesToEmbed, boxesToEmbed)
    : [];

  const embeddedPageCache = new Map<string, PDFEmbeddedPage>();
  for (let i = 0; i < keysToEmbed.length; i++) {
    embeddedPageCache.set(keysToEmbed[i], embeddedPagesList[i]);
  }

  // 3. Render sheets
  for (const sheet of sheets) {
    const newSheet = outDoc.addPage([sheetWPt, sheetHPt]);

    for (const cell of sheet.cells) {
      // Draw crop marks if enabled
      if (settings.drawCropMarks) {
        drawCellCropMarks(newSheet, cell, sheetHMm, settings.cropMarkLength, settings.bleed);
      }

      // Empty cell (e.g. blank page padding in booklet or spacer blank)
      if (cell.sourcePageIndex === null) {
        continue;
      }

      if (cell.sourcePageIndex < 0 || cell.sourcePageIndex >= totalSrcPages) {
        continue;
      }

      const part = cell.pagePart || 'full';
      const isSplit = part === 'left_half' || part === 'right_half';
      const cacheKey = `${cell.sourcePageIndex}_${part}`;
      const embeddedPage = embeddedPageCache.get(cacheKey);
      if (!embeddedPage) {
        continue;
      }

      const srcPage = srcDoc.getPage(cell.sourcePageIndex);
      const origAngle = srcPage.getRotation().angle || 0;
      const srcWPt = srcPage.getWidth();
      const srcHPt = srcPage.getHeight();

      // Visual dimensions of source page before imposition rotation
      const isOrigSwapped = origAngle === 90 || origAngle === 270;
      const fullVisualWMm = (isOrigSwapped ? srcHPt : srcWPt) / MM_TO_PT;
      const visualWMm = isSplit ? fullVisualWMm / 2 : fullVisualWMm;
      const visualHMm = (isOrigSwapped ? srcWPt : srcHPt) / MM_TO_PT;

      // Final visual dimensions in cell after imposition rotation (cell.rotation is clockwise)
      const isCellSwapped = cell.rotation === 90 || cell.rotation === 270;
      const finalRotWMm = isCellSwapped ? visualHMm : visualWMm;
      const finalRotHMm = isCellSwapped ? visualWMm : visualHMm;

      // Calculate scale
      let scale = 1;
      if (settings.scaleMode === 'fit') {
        scale = Math.min(cell.width / finalRotWMm, cell.height / finalRotHMm);
      } else if (settings.scaleMode === 'fill') {
        scale = Math.max(cell.width / finalRotWMm, cell.height / finalRotHMm);
      } else if (settings.scaleMode === 'custom') {
        scale = settings.customScale / 100;
      }

      // Centered bounding box in mm from top-left of sheet
      const placedRotWMm = finalRotWMm * scale;
      const placedRotHMm = finalRotHMm * scale;
      const dxMm = (cell.width - placedRotWMm) / 2;
      const dyMm = (cell.height - placedRotHMm) / 2;

      const boxLeftMm = cell.x + dxMm;
      const boxTopMm = cell.y + dyMm;

      // Convert bounding box to PDF coordinate space (bottom-left origin, in points)
      const xMinPt = boxLeftMm * MM_TO_PT;
      const yMinPt = (sheetHMm - (boxTopMm + placedRotHMm)) * MM_TO_PT;

      // Calculate total clockwise rotation to apply to raw embeddedPage
      const totalClockwise = (cell.rotation + origAngle) % 360;
      const theta_ccw = (360 - totalClockwise) % 360;

      // Unrotated drawing dimensions
      const drawWidth = embeddedPage.width * scale;
      const drawHeight = embeddedPage.height * scale;

      // Determine drawing origin depending on clockwise rotation
      let xDraw = xMinPt;
      let yDraw = yMinPt;

      if (totalClockwise === 0) {
        xDraw = xMinPt;
        yDraw = yMinPt;
      } else if (totalClockwise === 90) {
        xDraw = xMinPt;
        yDraw = yMinPt + drawWidth;
      } else if (totalClockwise === 180) {
        xDraw = xMinPt + drawWidth;
        yDraw = yMinPt + drawHeight;
      } else if (totalClockwise === 270) {
        xDraw = xMinPt + drawHeight;
        yDraw = yMinPt;
      }

      // Draw the page
      newSheet.drawPage(embeddedPage, {
        x: xDraw,
        y: yDraw,
        width: drawWidth,
        height: drawHeight,
        rotate: degrees(theta_ccw),
      });
    }
  }

  // 4. Save with low-memory writer options:
  // useObjectStreams: false avoids generating intermediate compressed object stream chunks.
  // updateFieldAppearances: false avoids AcroForm parsing.
  return await outDoc.save({
    useObjectStreams: false,
    updateFieldAppearances: false,
    objectsPerTick: Infinity,
  });
}
