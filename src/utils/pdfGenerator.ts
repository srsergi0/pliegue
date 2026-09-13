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

  // Ensure fresh, undivorced ArrayBuffer copy
  const safeBytes = sourcePdfBytes.slice(0);

  const srcDoc = await PDFDocument.load(safeBytes);
  const outDoc = await PDFDocument.create();

  const { width: sheetWMm, height: sheetHMm } = getEffectiveSheetDimensions(settings);
  const sheetWPt = sheetWMm * MM_TO_PT;
  const sheetHPt = sheetHMm * MM_TO_PT;

  // Cache embedded pages to avoid re-embedding identical pages across multiple slots or sheets
  const embeddedPageCache = new Map<number, PDFEmbeddedPage>();

  for (const sheet of sheets) {
    const newSheet = outDoc.addPage([sheetWPt, sheetHPt]);

    for (const cell of sheet.cells) {
      // 1. Draw crop marks if enabled
      if (settings.drawCropMarks) {
        drawCellCropMarks(newSheet, cell, sheetHMm, settings.cropMarkLength, settings.bleed);
      }

      // Empty cell (e.g. blank page padding in booklet)
      if (cell.sourcePageIndex === null) {
        continue;
      }

      if (cell.sourcePageIndex < 0 || cell.sourcePageIndex >= srcDoc.getPageCount()) {
        continue;
      }

      // 2. Retrieve or embed the source page
      let embeddedPage = embeddedPageCache.get(cell.sourcePageIndex);
      if (!embeddedPage) {
        const srcPage = srcDoc.getPage(cell.sourcePageIndex);
        const [emb] = await outDoc.embedPages([srcPage]);
        embeddedPage = emb;
        embeddedPageCache.set(cell.sourcePageIndex, emb);
      }

      const srcPage = srcDoc.getPage(cell.sourcePageIndex);
      const origAngle = srcPage.getRotation().angle || 0; // existing /Rotate in source PDF
      const srcWPt = srcPage.getWidth();
      const srcHPt = srcPage.getHeight();

      // Visual dimensions of source page before imposition rotation
      const isOrigSwapped = origAngle === 90 || origAngle === 270;
      const visualWMm = (isOrigSwapped ? srcHPt : srcWPt) / MM_TO_PT;
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
      // In pdf-lib, positive degrees rotate counter-clockwise:
      const theta_ccw = (360 - totalClockwise) % 360;

      // Unrotated drawing dimensions
      const drawWidth = srcWPt * scale;
      const drawHeight = srcHPt * scale;

      // Determine drawing origin depending on clockwise rotation
      let xDraw = xMinPt;
      let yDraw = yMinPt;

      if (totalClockwise === 0) {
        xDraw = xMinPt;
        yDraw = yMinPt;
      } else if (totalClockwise === 90) {
        // 90 deg clockwise
        xDraw = xMinPt;
        yDraw = yMinPt + drawWidth;
      } else if (totalClockwise === 180) {
        // 180 deg upside down
        xDraw = xMinPt + drawWidth;
        yDraw = yMinPt + drawHeight;
      } else if (totalClockwise === 270) {
        // 270 deg clockwise (90 deg counter-clockwise)
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

  return await outDoc.save();
}
