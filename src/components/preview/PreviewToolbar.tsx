import React from 'react';
import { ImposedSheet } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import { Button, IconButton, Input } from '../ui';

interface PreviewToolbarProps {
  activeSheet: ImposedSheet;
  currentSheetIdx: number;
  planLength: number;
  sheetInput: string;
  excludedCount: number;
  onToggleExcluded: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSheetInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSheetInputCommit: () => void;
  onSheetInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Preview controls. The sheet navigation is colour-coded: neutral for the
 * front (cara) and amber for the back (reverso).
 */
export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  activeSheet,
  currentSheetIdx,
  planLength,
  sheetInput,
  excludedCount,
  onToggleExcluded,
  onPrev,
  onNext,
  onSheetInputChange,
  onSheetInputCommit,
  onSheetInputKeyDown,
}) => {
  const { t } = useI18n();
  const isBack = activeSheet.side === 'back';

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 mb-4 pb-3 border-b border-neutral-200">
      <div className="flex items-center gap-2 select-none">
        {excludedCount > 0 && (
          <Button
            size="sm"
            onClick={onToggleExcluded}
            title={t.preview.showPanel}
            id="btn-toggle-excluded"
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold shadow-2xs"
          >
            <EyeOff className="w-3.5 h-3.5 text-rose-600" />
            <span>{excludedCount}</span>
          </Button>
        )}

        <div
          title={isBack ? t.preview.back : t.preview.front}
          className={`flex items-center rounded-lg p-0.5 shadow-2xs border transition-colors ${
            isBack ? 'bg-amber-50 border-amber-300' : 'bg-white border-neutral-200'
          }`}
        >
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
            <div className="w-11 shrink-0">
              <Input
                type="number"
                min={1}
                max={planLength}
                value={sheetInput}
                onChange={onSheetInputChange}
                onBlur={onSheetInputCommit}
                onKeyDown={onSheetInputKeyDown}
                className={`h-6 text-center border rounded px-0.5 outline-hidden transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text ${
                  isBack
                    ? 'text-amber-900 bg-amber-100/80 hover:bg-amber-100 focus:bg-white border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    : 'text-neutral-900 bg-neutral-100/90 hover:bg-neutral-200/60 focus:bg-white border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
                }`}
                title={t.preview.sheetInputTitle}
                id="input-sheet-number"
                aria-label={t.preview.sheetInputAria}
              />
            </div>
            <span
              className={`text-xs font-mono font-medium whitespace-nowrap shrink-0 ${
                isBack ? 'text-amber-500' : 'text-neutral-400'
              }`}
            >
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
