import React, { useEffect, useRef, useState } from 'react';
import { pdfjs } from '../../utils/pdfSetup';
import { ImpositionSettings, PagePart } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { RefreshCw } from 'lucide-react';

interface PageThumbnailProps {
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
export const PageThumbnail: React.FC<PageThumbnailProps> = ({
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
