import React from 'react';
import { ImpositionSettings, ImposedSheet } from '../../types';

interface CropMarksProps {
  activeSheet: ImposedSheet;
  settings: ImpositionSettings;
  sheetW: number;
  sheetH: number;
}

/**
 * Vector crop marks. Geometry mirrors pdfGenerator: the mark is offset outside
 * the trim by `bleed` and has length `cropMarkLength` (mm).
 */
export const CropMarks: React.FC<CropMarksProps> = ({
  activeSheet,
  settings,
  sheetW,
  sheetH,
}) => {
  if (!settings.drawCropMarks) return null;

  return (
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
  );
};
