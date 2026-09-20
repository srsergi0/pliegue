import React, { useState } from 'react';
import { ImpositionSettings } from '../../types';
import { Crop, Link2, Unlink2, Scissors, LayoutDashboard } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { Button, NumberField, Checkbox } from '../ui';

interface MarginsTabProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
}

export const MarginsTab: React.FC<MarginsTabProps> = ({
  settings,
  onChangeSettings,
}) => {
  const { t } = useI18n();
  const [marginsLinked, setMarginsLinked] = useState<boolean>(true);

  const updateSetting = <K extends keyof ImpositionSettings>(
    key: K,
    value: ImpositionSettings[K]
  ) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleMarginChange = (
    key: 'marginTop' | 'marginBottom' | 'marginLeft' | 'marginRight',
    val: number
  ) => {
    const safeVal = Math.max(0, val);
    if (marginsLinked) {
      onChangeSettings({
        ...settings,
        marginTop: safeVal,
        marginBottom: safeVal,
        marginLeft: safeVal,
        marginRight: safeVal,
      });
    } else {
      updateSetting(key, safeVal);
    }
  };

  const applyMarginPreset = (val: number) => {
    onChangeSettings({
      ...settings,
      marginTop: val,
      marginBottom: val,
      marginLeft: val,
      marginRight: val,
    });
  };

  const applyGutterPreset = (val: number) => {
    onChangeSettings({
      ...settings,
      gutterHorizontal: val,
      gutterVertical: val,
    });
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* 1. SECCIÓN: MÁRGENES EXTERIORES */}
      <div className="p-3.5 bg-neutral-50/90 rounded-xl border border-neutral-200/90 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/70">
          <div className="flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5 text-neutral-700" />
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-800">
              {t.margins.marginsSection}
            </span>
          </div>

          {/* Presets rápidos */}
          <div className="flex items-center gap-1">
            {[0, 5, 10].map((presetMm) => (
              <Button
                key={presetMm}
                variant="chip"
                size="xs"
                onClick={() => applyMarginPreset(presetMm)}
              >
                {presetMm}mm
              </Button>
            ))}
          </div>
        </div>

        {/* Botón de vincular márgenes */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-600">
            {t.margins.independentAdjustments}
          </span>
          {marginsLinked ? (
            <Button
              variant="chip"
              size="xs"
              className="bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-900"
              onClick={() => setMarginsLinked(false)}
            >
              <Link2 className="w-3 h-3" />
              <span>{t.margins.linked}</span>
            </Button>
          ) : (
            <Button
              variant="chip"
              size="xs"
              className="bg-white text-neutral-600 border-neutral-300"
              onClick={() => setMarginsLinked(true)}
            >
              <Unlink2 className="w-3 h-3" />
              <span>{t.margins.unlinked}</span>
            </Button>
          )}
        </div>

        {/* Grid 2x2 para Arriba, Abajo, Izq, Der (amplio y sin solapamiento de flechas) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Arriba */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{t.margins.top}</span>
            <div className="flex items-center gap-1">
              <NumberField
                variant="inline"
                min={0}
                value={settings.marginTop}
                onValueChange={(v) => handleMarginChange('marginTop', v)}
                id="margin-top"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>

          {/* Abajo */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{t.margins.bottom}</span>
            <div className="flex items-center gap-1">
              <NumberField
                variant="inline"
                min={0}
                value={settings.marginBottom}
                onValueChange={(v) => handleMarginChange('marginBottom', v)}
                id="margin-bottom"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>

          {/* Izquierda */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{t.margins.left}</span>
            <div className="flex items-center gap-1">
              <NumberField
                variant="inline"
                min={0}
                value={settings.marginLeft}
                onValueChange={(v) => handleMarginChange('marginLeft', v)}
                id="margin-left"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>

          {/* Derecha */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{t.margins.right}</span>
            <div className="flex items-center gap-1">
              <NumberField
                variant="inline"
                min={0}
                value={settings.marginRight}
                onValueChange={(v) => handleMarginChange('marginRight', v)}
                id="margin-right"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN: CALLES / SEPARACIÓN ENTRE PÁGINAS */}
      <div className="p-3.5 bg-neutral-50/90 rounded-xl border border-neutral-200/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/70">
          <div className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-neutral-700" />
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-800">
              {t.margins.innerGutter}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[0, 3, 6].map((gutterMm) => (
              <Button
                key={gutterMm}
                variant="chip"
                size="xs"
                onClick={() => applyGutterPreset(gutterMm)}
              >
                {gutterMm}mm
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Horizontal */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{t.margins.horizontalGutter}</span>
            <div className="flex items-center gap-1">
              <NumberField
                variant="inline"
                min={0}
                value={settings.gutterHorizontal}
                onValueChange={(v) => updateSetting('gutterHorizontal', v)}
                id="gutter-horizontal"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>

          {/* Vertical */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{t.margins.verticalGutter}</span>
            <div className="flex items-center gap-1">
              <NumberField
                variant="inline"
                min={0}
                value={settings.gutterVertical}
                onValueChange={(v) => updateSetting('gutterVertical', v)}
                id="gutter-vertical"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN: MARCAS DE CORTE & SANGRADO */}
      <div className="p-3.5 bg-neutral-50/90 rounded-xl border border-neutral-200/90 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 pb-1.5 border-b border-neutral-200/70">
          <Crop className="w-3.5 h-3.5 text-neutral-700" />
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-800">
              {t.margins.cutSectionTitle}
            </span>
        </div>

        <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-neutral-200/80 cursor-pointer select-none">
          <Checkbox
            checked={settings.drawCropMarks}
            onChange={(e) => updateSetting('drawCropMarks', e.target.checked)}
            id="checkbox-crop-marks"
          />
          <div className="flex flex-col">
            <span className="text-xs text-neutral-800 font-semibold">
              {t.margins.drawCropMarks}
            </span>
            <span className="text-[10px] text-neutral-400">
              {t.margins.cutGuideDesc}
            </span>
          </div>
        </label>

        {settings.drawCropMarks && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-neutral-200">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-mono">{t.margins.bleed}</label>
              <NumberField
                min={0}
                step={0.5}
                value={settings.bleed}
                onValueChange={(v) => updateSetting('bleed', v)}
                className="font-bold"
                id="bleed"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-mono">{t.margins.markLength}</label>
              <NumberField
                min={1}
                value={settings.cropMarkLength}
                onValueChange={(v) => updateSetting('cropMarkLength', v)}
                className="font-bold"
                id="crop-mark-length"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
