import React from 'react';
import { ImposedSheet } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { ArrowRightLeft, ChevronLeft, ChevronRight, Sun } from 'lucide-react';
import { Button, IconButton, Input } from '../ui';

interface PreviewToolbarProps {
  activeSheet: ImposedSheet;
  currentSheetIdx: number;
  planLength: number;
  sheetInput: string;
  hasFlipPair: boolean;
  showLightTable: boolean;
  sheetW: number;
  sheetH: number;
  sheetPreset: string;
  onToggleFlip: () => void;
  onToggleLightTable: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSheetInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSheetInputCommit: () => void;
  onSheetInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Preview header: sheet label/side badge, flip & light table toggles and the
 * sheet navigation control.
 */
export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  activeSheet,
  currentSheetIdx,
  planLength,
  sheetInput,
  hasFlipPair,
  showLightTable,
  sheetW,
  sheetH,
  sheetPreset,
  onToggleFlip,
  onToggleLightTable,
  onPrev,
  onNext,
  onSheetInputChange,
  onSheetInputCommit,
  onSheetInputKeyDown,
}) => {
  const { t } = useI18n();

  return (
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
            {t.preview.sheetOf} {currentSheetIdx + 1} {t.preview.totalSheets} {planLength} • {t.preview.sheetWord} {sheetPreset} ({sheetW} × {sheetH} mm) • {activeSheet.cells.length} {t.preview.cellsWord} ({activeSheet.cells[0] ? `${activeSheet.cells[0].width.toFixed(1)} × ${activeSheet.cells[0].height.toFixed(1)} mm` : ''})
          </p>
        </div>
      </div>

      {/* Quick Side Flip, Light Table & Navigation buttons */}
      <div className="flex items-center gap-2 select-none">
        {hasFlipPair && (
          <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs gap-0.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFlip}
              title={activeSheet.side === 'front' ? t.preview.flipTitleToBack : t.preview.flipTitleToFront}
              id="btn-toggle-flip"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t.preview.flipTo} <strong className="font-semibold text-neutral-900">{activeSheet.side === 'front' ? t.preview.backShort : t.preview.frontShort}</strong></span>
            </Button>

            <div className="w-[1px] h-4 bg-neutral-200 mx-0.5" />

            <Button
              size="sm"
              onClick={onToggleLightTable}
              title={t.preview.lightTableTooltip}
              id="btn-toggle-light-table"
              className={
                showLightTable
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 font-semibold shadow-2xs hover:bg-amber-100'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }
            >
              <Sun className={`w-3.5 h-3.5 ${showLightTable ? 'text-amber-600 animate-pulse' : 'text-neutral-500'}`} />
              <span>{t.preview.lightTable}</span>
              {showLightTable && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </Button>
          </div>
        )}

        <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs">
          <IconButton
            tone="preview"
            size="sm"
            onClick={onPrev}
            disabled={currentSheetIdx === 0}
            title={t.preview.prevSheet}
            id="btn-prev-sheet"
          >
            <ChevronLeft className="w-4 h-4" />
          </IconButton>

          <div className="flex items-center gap-1 px-1 select-none">
            <Input
              type="number"
              min={1}
              max={planLength}
              value={sheetInput}
              onChange={onSheetInputChange}
              onBlur={onSheetInputCommit}
              onKeyDown={onSheetInputKeyDown}
              className="w-11 h-6 text-center text-neutral-900 bg-neutral-100/90 hover:bg-neutral-200/60 focus:bg-white border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded px-0.5 outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
              title={t.preview.sheetInputTitle}
              id="input-sheet-number"
              aria-label={t.preview.sheetInputAria}
            />
            <span className="text-xs font-mono font-medium text-neutral-400">
              / {planLength}
            </span>
          </div>

          <IconButton
            tone="preview"
            size="sm"
            onClick={onNext}
            disabled={currentSheetIdx === planLength - 1}
            title={t.preview.nextSheet}
            id="btn-next-sheet"
          >
            <ChevronRight className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
};
