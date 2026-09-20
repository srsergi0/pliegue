import React, { useMemo } from 'react';
import { ImpositionSettings, ImposedSheet } from '../types';
import { getEffectiveSheetDimensions } from '../utils/imposition';
import { useI18n } from '../i18n/I18nContext';

interface StatusBarProps {
  settings: ImpositionSettings;
  plan: ImposedSheet[];
  activeSheet: ImposedSheet | undefined;
  currentSheetIdx: number;
}

/**
 * Bottom status bar: production totals on the left and the current sheet info
 * (front/back colour-coded) on the right.
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  settings,
  plan,
  activeSheet,
  currentSheetIdx,
}) => {
  const { t } = useI18n();

  const stats = useMemo(() => {
    if (plan.length === 0) return null;

    const sheetNumbers = new Set<number>();
    let blanks = 0;
    for (const sheet of plan) {
      sheetNumbers.add(sheet.sheetNumber);
      for (const cell of sheet.cells) {
        if (cell.sourcePageIndex === null) blanks++;
      }
    }

    const physicalSheets = sheetNumbers.size;
    const pagesPerSide = Math.max(1, settings.gridCols * settings.gridRows);

    let signatures = 0;
    if (settings.layoutMode === 'booklet' && settings.signatureSize > 0) {
      const sheetsPerSignature = Math.max(1, settings.signatureSize / (pagesPerSide * 2));
      signatures = Math.ceil(physicalSheets / sheetsPerSignature);
    }

    const excluded = settings.excludedPageIndices?.length ?? 0;

    return { impressions: plan.length, physicalSheets, pagesPerSide, signatures, blanks, excluded };
  }, [plan, settings]);

  if (!stats) return null;

  const { width: sheetW, height: sheetH } = getEffectiveSheetDimensions(settings);
  const firstCell = activeSheet?.cells[0];

  const items: { value: string; label: string }[] = [
    { value: String(stats.impressions), label: t.summary.impressions },
    { value: String(stats.physicalSheets), label: t.summary.sheets },
    { value: String(stats.pagesPerSide), label: t.summary.perSide },
  ];
  if (stats.signatures > 1) items.push({ value: String(stats.signatures), label: t.summary.signatures });
  if (stats.blanks > 0) items.push({ value: String(stats.blanks), label: t.summary.blanks });
  if (stats.excluded > 0) items.push({ value: String(stats.excluded), label: t.summary.excluded });

  const isBack = activeSheet?.side === 'back';

  return (
    <div className="shrink-0 border-t border-neutral-200/80 bg-white/90 backdrop-blur-md px-6 py-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap overflow-x-auto select-none">
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          {idx > 0 && <span className="text-neutral-300 text-[10px]">·</span>}
          <span className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[11px] font-mono font-bold text-neutral-800 tabular-nums">
              {item.value}
            </span>
            <span className="text-[10px] text-neutral-400">{item.label}</span>
          </span>
        </React.Fragment>
      ))}

      {activeSheet && (
        <>
          <span className="text-neutral-200 text-[10px] ml-auto">|</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[11px] font-bold text-neutral-800">{activeSheet.label}</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm text-white ${
                isBack ? 'bg-amber-700' : 'bg-neutral-900'
              }`}
            >
              {isBack ? t.preview.back : t.preview.front}
            </span>
          </span>
          <span className="text-[10px] text-neutral-400 whitespace-nowrap">
            {t.preview.sheetOf} {currentSheetIdx + 1} {t.preview.totalSheets} {plan.length} • {t.preview.sheetWord} {settings.sheetPreset} ({sheetW} × {sheetH} mm) • {activeSheet.cells.length} {t.preview.cellsWord} ({firstCell ? `${firstCell.width.toFixed(1)} × ${firstCell.height.toFixed(1)} mm` : ''})
          </span>
        </>
      )}
    </div>
  );
};
