import React from 'react';
import { Scissors } from 'lucide-react';
import { VerticalSeam, HorizontalSeam } from './previewGeometry';

interface SeamGuidesProps {
  verticalLines: VerticalSeam[];
  horizontalLines: HorizontalSeam[];
}

/**
 * Booklet spine / fold & cut guides derived from the actual cell coordinates.
 */
export const SeamGuides: React.FC<SeamGuidesProps> = ({
  verticalLines,
  horizontalLines,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Vertical seam lines */}
      {verticalLines.map((vLine, idx) => (
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
      {horizontalLines.map((hLine, idx) => (
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
  );
};
