import React, { useState } from 'react';
import { ImpositionSettings } from '../../types';
import { Crop, Link2, Unlink2, Scissors, LayoutDashboard } from 'lucide-react';

interface MarginsTabProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
}

export const MarginsTab: React.FC<MarginsTabProps> = ({
  settings,
  onChangeSettings,
}) => {
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
              Márgenes del Pliego
            </span>
          </div>

          {/* Presets rápidos */}
          <div className="flex items-center gap-1">
            {[0, 5, 10].map((presetMm) => (
              <button
                key={presetMm}
                type="button"
                onClick={() => applyMarginPreset(presetMm)}
                className="text-[10px] font-semibold text-neutral-700 px-2 py-0.5 rounded bg-white hover:bg-neutral-100 border border-neutral-200 cursor-pointer transition-colors shadow-2xs"
              >
                {presetMm}mm
              </button>
            ))}
          </div>
        </div>

        {/* Botón de vincular márgenes */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-600">
            Ajustes independientes
          </span>
          <button
            type="button"
            onClick={() => setMarginsLinked(!marginsLinked)}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer border ${
              marginsLinked
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
            }`}
          >
            {marginsLinked ? (
              <>
                <Link2 className="w-3 h-3" />
                <span>Vinculados</span>
              </>
            ) : (
              <>
                <Unlink2 className="w-3 h-3" />
                <span>Independientes</span>
              </>
            )}
          </button>
        </div>

        {/* Grid 2x2 para Arriba, Abajo, Izq, Der (amplio y sin solapamiento de flechas) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Arriba */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Arriba</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={settings.marginTop}
                onChange={(e) => handleMarginChange('marginTop', Number(e.target.value))}
                className="w-12 text-right text-xs font-mono font-bold text-neutral-800 bg-transparent focus:outline-hidden"
                id="margin-top"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>

          {/* Abajo */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Abajo</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={settings.marginBottom}
                onChange={(e) => handleMarginChange('marginBottom', Number(e.target.value))}
                className="w-12 text-right text-xs font-mono font-bold text-neutral-800 bg-transparent focus:outline-hidden"
                id="margin-bottom"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>

          {/* Izquierda */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Izquierda</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={settings.marginLeft}
                onChange={(e) => handleMarginChange('marginLeft', Number(e.target.value))}
                className="w-12 text-right text-xs font-mono font-bold text-neutral-800 bg-transparent focus:outline-hidden"
                id="margin-left"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>

          {/* Derecha */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Derecha</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={settings.marginRight}
                onChange={(e) => handleMarginChange('marginRight', Number(e.target.value))}
                className="w-12 text-right text-xs font-mono font-bold text-neutral-800 bg-transparent focus:outline-hidden"
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
              Separación Interior (Calles)
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[0, 3, 6].map((gutterMm) => (
              <button
                key={gutterMm}
                type="button"
                onClick={() => applyGutterPreset(gutterMm)}
                className="text-[10px] font-semibold text-neutral-700 px-2 py-0.5 rounded bg-white hover:bg-neutral-100 border border-neutral-200 cursor-pointer transition-colors shadow-2xs"
              >
                {gutterMm}mm
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Horizontal */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Horizontal</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={settings.gutterHorizontal}
                onChange={(e) => updateSetting('gutterHorizontal', Math.max(0, Number(e.target.value)))}
                className="w-12 text-right text-xs font-mono font-bold text-neutral-800 bg-transparent focus:outline-hidden"
                id="gutter-horizontal"
              />
              <span className="text-[10px] text-neutral-400 font-mono">mm</span>
            </div>
          </div>

          {/* Vertical */}
          <div className="flex items-center justify-between bg-white border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Vertical</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={settings.gutterVertical}
                onChange={(e) => updateSetting('gutterVertical', Math.max(0, Number(e.target.value)))}
                className="w-12 text-right text-xs font-mono font-bold text-neutral-800 bg-transparent focus:outline-hidden"
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
            Marcas de Corte y Guillotina
          </span>
        </div>

        <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-neutral-200/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.drawCropMarks}
            onChange={(e) => updateSetting('drawCropMarks', e.target.checked)}
            className="w-4 h-4 accent-neutral-900 rounded border-neutral-300 cursor-pointer"
            id="checkbox-crop-marks"
          />
          <div className="flex flex-col">
            <span className="text-xs text-neutral-800 font-semibold">
              Dibujar marcas de corte en cruz
            </span>
            <span className="text-[10px] text-neutral-400">
              Guías de precisión en esquinas para guillotina industrial
            </span>
          </div>
        </label>

        {settings.drawCropMarks && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-neutral-200">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-mono">Sangría / Bleed (mm)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={settings.bleed}
                onChange={(e) => updateSetting('bleed', Math.max(0, Number(e.target.value)))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800 font-bold"
                id="bleed"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-mono">Largo de marca (mm)</label>
              <input
                type="number"
                min={1}
                value={settings.cropMarkLength}
                onChange={(e) => updateSetting('cropMarkLength', Math.max(1, Number(e.target.value)))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800 font-bold"
                id="crop-mark-length"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
