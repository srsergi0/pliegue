import React, { useMemo } from 'react';
import { ImpositionSettings, ImposedSheet } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface ProductionSummaryProps {
  settings: ImpositionSettings;
  plan: ImposedSheet[];
}

interface SummaryItem {
  value: string;
  label: string;
}

/**
 * Compact, single-line production readout for the current imposition job:
 * impressions (printed sides), physical sheets, pages per side, printing
 * sides, signatures, injected blanks and excluded source pages.
 */
export const ProductionSummary: React.FC<ProductionSummaryProps> = ({
  settings,
  plan,
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

  const items: SummaryItem[] = [
    { value: String(stats.impressions), label: t.summary.impressions },
    { value: String(stats.physicalSheets), label: t.summary.sheets },
    { value: String(stats.pagesPerSide), label: t.summary.perSide },
    { value: String(settings.duplexMode === 'simplex' ? 1 : 2), label: t.summary.sides },
  ];
  if (stats.signatures > 1) {
    items.push({ value: String(stats.signatures), label: t.summary.signatures });
  }
  if (stats.blanks > 0) {
    items.push({ value: String(stats.blanks), label: t.summary.blanks });
  }
  if (stats.excluded > 0) {
    items.push({ value: String(stats.excluded), label: t.summary.excluded });
  }

  return (
    <div
      aria-label={t.summary.title}
      className="shrink-0 border-b border-neutral-200/80 bg-white/70 px-6 py-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap overflow-x-auto select-none"
    >
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
    </div>
  );
};
