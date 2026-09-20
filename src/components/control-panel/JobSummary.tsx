import React from 'react';
import { ImpositionSettings, PDFSourceInfo, LayoutMode } from '../../types';
import { resolveTargetPageDimensions } from '../../utils/imposition';
import { useI18n } from '../../i18n/I18nContext';

interface JobSummaryProps {
  settings: ImpositionSettings;
  sourcePDFInfo: PDFSourceInfo | null;
  onJump: (stepId: string) => void;
}

interface SummaryChip {
  label: string;
  value: string;
  stepId: string;
}

/**
 * Compact, always-visible readout of the current setup. Each chip jumps to and
 * expands the step that owns that setting.
 */
export const JobSummary: React.FC<JobSummaryProps> = ({
  settings,
  sourcePDFInfo,
  onJump,
}) => {
  const { t } = useI18n();

  const modeLabel = (mode: LayoutMode) => {
    switch (mode) {
      case 'booklet': return t.layout.modeBooklet;
      case 'duplex_sheetwise': return t.layout.modeDuplex;
      case 'cut_and_stack': return t.layout.modeCutStack;
      case 'sequential': return t.layout.modeSequential;
      case 'step_and_repeat': return t.layout.modeRepeat;
      default: return mode;
    }
  };

  const target = resolveTargetPageDimensions(settings, sourcePDFInfo);

  const chips: SummaryChip[] = [
    { label: t.steps.product, value: modeLabel(settings.layoutMode), stepId: 'step-product' },
    {
      label: t.steps.sheet,
      value: settings.sheetPreset === 'Custom'
        ? `${settings.sheetWidth}×${settings.sheetHeight} mm`
        : settings.sheetPreset,
      stepId: 'step-sheet',
    },
    {
      label: t.steps.distribution,
      value: `${settings.gridCols}×${settings.gridRows}`,
      stepId: 'step-distribution',
    },
    {
      label: t.steps.print,
      value: settings.duplexMode === 'simplex' ? t.adjustments.duplexSingle : t.adjustments.duplexLong,
      stepId: 'step-print',
    },
  ];

  if (target.width > 0 && target.height > 0) {
    chips.push({
      label: t.layout.cutSizeLabel,
      value: `${target.width.toFixed(0)}×${target.height.toFixed(0)} mm`,
      stepId: 'step-distribution',
    });
  }

  return (
    <div
      aria-label={t.steps.summaryTitle}
      className="shrink-0 px-3 py-2 border-b border-neutral-200/80 bg-neutral-50/70 flex flex-wrap items-center gap-1.5 select-none"
    >
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onJump(chip.stepId)}
          title={`${chip.label}: ${chip.value}`}
          className="inline-flex items-baseline gap-1 max-w-full text-[10px] bg-white border border-neutral-200/90 rounded-md px-1.5 py-0.5 hover:border-neutral-300 hover:bg-neutral-100/70 transition-colors cursor-pointer"
        >
          <span className="text-neutral-400">{chip.label}</span>
          <span className="font-bold text-neutral-800 font-mono truncate">{chip.value}</span>
        </button>
      ))}
    </div>
  );
};
