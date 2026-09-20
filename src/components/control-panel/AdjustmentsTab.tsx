import React from 'react';
import {
  ImpositionSettings,
  DuplexMode,
  ScaleMode,
} from '../../types';
import {
  Printer,
  Sliders,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { SegmentedButton, Checkbox } from '../ui';

interface AdjustmentsTabProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
}

export const AdjustmentsTab: React.FC<AdjustmentsTabProps> = ({
  settings,
  onChangeSettings,
}) => {
  const { t } = useI18n();
  const updateSetting = <K extends keyof ImpositionSettings>(
    key: K,
    value: ImpositionSettings[K]
  ) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* 1. SECCIÓN: DÚPLEX & VOLTEO */}
      <div className="p-3.5 bg-neutral-50/90 rounded-xl border border-neutral-200/90 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 pb-1.5 border-b border-neutral-200/70">
          <Printer className="w-3.5 h-3.5 text-neutral-700" />
          <span className="text-xs uppercase tracking-wider font-bold text-neutral-800">
            {t.adjustments.duplexSection}
          </span>
        </div>

        {/* Selector de modo dúplex en 3 botones limpios */}
        <div className="grid grid-cols-3 gap-1 bg-neutral-200/60 p-1 rounded-lg">
          <SegmentedButton
            active={settings.duplexMode === 'long_edge'}
            size="md"
            onClick={() => updateSetting('duplexMode', 'long_edge')}
            title={t.adjustments.duplexLongHint}
          >
            {t.adjustments.duplexLong}
          </SegmentedButton>
          <SegmentedButton
            active={settings.duplexMode === 'short_edge'}
            size="md"
            onClick={() => updateSetting('duplexMode', 'short_edge')}
            title={t.adjustments.duplexShortHint}
          >
            {t.adjustments.duplexShort}
          </SegmentedButton>
          <SegmentedButton
            active={settings.duplexMode === 'simplex'}
            size="md"
            onClick={() => updateSetting('duplexMode', 'simplex')}
            title={t.adjustments.duplexSingleHint}
          >
            {t.adjustments.duplexSingle}
          </SegmentedButton>
        </div>
      </div>

      {/* 2. SECCIÓN: ESCALA DE PÁGINAS */}
      <div className="p-3.5 bg-neutral-50/90 rounded-xl border border-neutral-200/90 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 pb-1.5 border-b border-neutral-200/70">
          <Sliders className="w-3.5 h-3.5 text-neutral-700" />
          <span className="text-xs uppercase tracking-wider font-bold text-neutral-800">
            {t.adjustments.scalingTitle}
          </span>
        </div>

        {/* 4 modos de escala */}
        <div className="grid grid-cols-4 gap-1 bg-neutral-200/60 p-1 rounded-lg">
          <SegmentedButton
            active={settings.scaleMode === 'fit'}
            size="sm"
            onClick={() => updateSetting('scaleMode', 'fit')}
            title={t.adjustments.scaleFitHint}
          >
            {t.adjustments.scaleFitShort}
          </SegmentedButton>
          <SegmentedButton
            active={settings.scaleMode === 'fill'}
            size="sm"
            onClick={() => updateSetting('scaleMode', 'fill')}
            title={t.adjustments.scaleFillHint}
          >
            {t.adjustments.scaleFillShort}
          </SegmentedButton>
          <SegmentedButton
            active={settings.scaleMode === 'original'}
            size="sm"
            onClick={() => updateSetting('scaleMode', 'original')}
            title={t.adjustments.scale100Hint}
          >
            {t.adjustments.scale100Short}
          </SegmentedButton>
          <SegmentedButton
            active={settings.scaleMode === 'custom'}
            size="sm"
            onClick={() => updateSetting('scaleMode', 'custom')}
            title={t.adjustments.scaleManualHint}
          >
            {t.adjustments.scaleManualShort}
          </SegmentedButton>
        </div>

        {/* Slider manual si aplica */}
        {settings.scaleMode === 'custom' && (
          <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-neutral-200">
            <input
              type="range"
              min={10}
              max={200}
              value={settings.customScale}
              onChange={(e) => updateSetting('customScale', Number(e.target.value))}
              className="flex-1 accent-neutral-900 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
              id="scale-slider"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={10}
                max={200}
                value={settings.customScale}
                onChange={(e) =>
                  updateSetting(
                    'customScale',
                    Math.max(10, Math.min(200, Number(e.target.value)))
                  )
                }
                className="w-14 bg-neutral-50 border border-neutral-200 rounded-md px-1.5 py-0.5 text-center text-xs text-neutral-800 font-bold"
                id="scale-input"
              />
              <span className="text-xs text-neutral-500 font-mono">%</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. SECCIÓN: ROTACIÓN DE PÁGINAS */}
      <div className="p-3.5 bg-neutral-50/90 rounded-xl border border-neutral-200/90 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 pb-1.5 border-b border-neutral-200/70">
          <RotateCw className="w-3.5 h-3.5 text-neutral-700" />
          <span className="text-xs uppercase tracking-wider font-bold text-neutral-800">
            {t.adjustments.rotationTitle}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-neutral-600">{t.adjustments.baseAngle}</label>
          <div className="grid grid-cols-4 gap-1 bg-neutral-200/60 p-1 rounded-lg">
            {([0, 90, 180, 270] as const).map((angle) => (
              <SegmentedButton
                key={angle}
                active={settings.pageRotation === angle}
                size="xs"
                onClick={() => updateSetting('pageRotation', angle)}
              >
                {angle}°
              </SegmentedButton>
            ))}
          </div>
        </div>

        {/* Auto rotar inteligente */}
        <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-neutral-200/80 cursor-pointer select-none">
          <Checkbox
            checked={settings.autoRotateToFit}
            onChange={(e) => updateSetting('autoRotateToFit', e.target.checked)}
            id="checkbox-auto-rotate"
          />
          <div className="flex flex-col">
            <span className="text-xs text-neutral-800 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {t.adjustments.autoRotateToFit}
            </span>
            <span className="text-[10px] text-neutral-400">
              {t.adjustments.autoRotateDesc}
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
