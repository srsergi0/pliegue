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
          <button
            type="button"
            onClick={() => updateSetting('duplexMode', 'long_edge')}
            title={t.adjustments.duplexLongHint}
            className={`text-xs py-1.5 px-1 rounded-md font-semibold text-center transition-all cursor-pointer ${
              settings.duplexMode === 'long_edge'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
          >
            {t.adjustments.duplexLong}
          </button>
          <button
            type="button"
            onClick={() => updateSetting('duplexMode', 'short_edge')}
            title={t.adjustments.duplexShortHint}
            className={`text-xs py-1.5 px-1 rounded-md font-semibold text-center transition-all cursor-pointer ${
              settings.duplexMode === 'short_edge'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
          >
            {t.adjustments.duplexShort}
          </button>
          <button
            type="button"
            onClick={() => updateSetting('duplexMode', 'simplex')}
            title={t.adjustments.duplexSingleHint}
            className={`text-xs py-1.5 px-1 rounded-md font-semibold text-center transition-all cursor-pointer ${
              settings.duplexMode === 'simplex'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
          >
            {t.adjustments.duplexSingle}
          </button>
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
          <button
            type="button"
            onClick={() => updateSetting('scaleMode', 'fit')}
            className={`text-[11px] py-1.5 rounded-md font-semibold transition-all cursor-pointer text-center ${
              settings.scaleMode === 'fit'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
            title={t.adjustments.scaleFitHint}
          >
            {t.adjustments.scaleFitShort}
          </button>
          <button
            type="button"
            onClick={() => updateSetting('scaleMode', 'fill')}
            className={`text-[11px] py-1.5 rounded-md font-semibold transition-all cursor-pointer text-center ${
              settings.scaleMode === 'fill'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
            title={t.adjustments.scaleFillHint}
          >
            {t.adjustments.scaleFillShort}
          </button>
          <button
            type="button"
            onClick={() => updateSetting('scaleMode', 'original')}
            className={`text-[11px] py-1.5 rounded-md font-semibold transition-all cursor-pointer text-center ${
              settings.scaleMode === 'original'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
            title={t.adjustments.scale100Hint}
          >
            {t.adjustments.scale100Short}
          </button>
          <button
            type="button"
            onClick={() => updateSetting('scaleMode', 'custom')}
            className={`text-[11px] py-1.5 rounded-md font-semibold transition-all cursor-pointer text-center ${
              settings.scaleMode === 'custom'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
            title={t.adjustments.scaleManualHint}
          >
            {t.adjustments.scaleManualShort}
          </button>
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
              <button
                key={angle}
                type="button"
                onClick={() => updateSetting('pageRotation', angle)}
                className={`text-xs py-1 rounded-md font-semibold transition-all cursor-pointer text-center ${
                  settings.pageRotation === angle
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>

        {/* Auto rotar inteligente */}
        <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-neutral-200/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.autoRotateToFit}
            onChange={(e) => updateSetting('autoRotateToFit', e.target.checked)}
            className="w-4 h-4 accent-neutral-900 rounded border-neutral-300 cursor-pointer"
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
