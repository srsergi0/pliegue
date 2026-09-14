import React, { useMemo } from 'react';
import {
  ImpositionSettings,
  SHEET_PRESETS,
  SheetSizePreset,
  TARGET_PAGE_PRESETS,
  TargetPagePreset,
  LayoutMode,
  GridOrder,
  BindingEdge,
  DuplexItemMode,
  PDFSourceInfo,
  Booklet4UpMode,
} from '../../types';
import {
  calculateOptimalTargetLayout,
  resolveTargetPageDimensions,
  buildVirtualPageList,
} from '../../utils/imposition';
import { Scissors, Layers, Columns, BookOpen, Compass, Sparkles, FileText } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface LayoutTabProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
  sourcePDFInfo: PDFSourceInfo | null;
}

export const LayoutTab: React.FC<LayoutTabProps> = ({
  settings,
  onChangeSettings,
  sourcePDFInfo,
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

  const handleSheetPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value as SheetSizePreset;
    const preset = SHEET_PRESETS.find((p) => p.name === presetName);

    if (preset) {
      const newSettings: ImpositionSettings = {
        ...settings,
        sheetPreset: presetName,
        sheetWidth: preset.width,
        sheetHeight: preset.height,
      };

      if (settings.layoutMode !== 'booklet' && settings.targetPagePreset !== 'auto') {
        const target = resolveTargetPageDimensions(newSettings, sourcePDFInfo);
        if (target.width > 0 && target.height > 0) {
          const opt = calculateOptimalTargetLayout(
            preset.width,
            preset.height,
            target.width,
            target.height,
            newSettings
          );
          newSettings.gridCols = opt.cols;
          newSettings.gridRows = opt.rows;
          newSettings.sheetOrientation = opt.sheetOrientation;
          newSettings.autoRotateToFit = true;
        }
      }

      onChangeSettings(newSettings);
    } else {
      onChangeSettings({
        ...settings,
        sheetPreset: 'Custom',
      });
    }
  };

  const handleTargetPresetChange = (presetName: TargetPagePreset) => {
    const preset = TARGET_PAGE_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    if (presetName === 'auto') {
      onChangeSettings({
        ...settings,
        targetPagePreset: 'auto',
      });
      return;
    }

    let targetW = preset.width;
    let targetH = preset.height;

    if (presetName === 'original') {
      targetW = sourcePDFInfo ? sourcePDFInfo.firstPageWidth : 210;
      targetH = sourcePDFInfo ? sourcePDFInfo.firstPageHeight : 297;
    } else if (presetName === 'Custom') {
      targetW = settings.targetPageWidth || 100;
      targetH = settings.targetPageHeight || 100;
    }

    const opt = calculateOptimalTargetLayout(
      settings.sheetWidth,
      settings.sheetHeight,
      targetW,
      targetH,
      settings
    );

    onChangeSettings({
      ...settings,
      targetPagePreset: presetName,
      targetPageWidth: targetW,
      targetPageHeight: targetH,
      gridCols: opt.cols,
      gridRows: opt.rows,
      sheetOrientation: opt.sheetOrientation,
      autoRotateToFit: true,
      scaleMode: 'fit',
    });
  };

  const currentTarget = resolveTargetPageDimensions(settings, sourcePDFInfo);

  const targetPresetLabel = (name: TargetPagePreset, fallback: string) => {
    switch (name) {
      case 'auto': return t.layout.autoOption;
      case 'original': return t.layout.originalOption;
      case 'Custom': return t.layout.customOption;
      case 'A5': return t.layout.tpA5;
      case 'A6': return t.layout.tpA6;
      case 'A7': return t.layout.tpA7;
      case 'A8': return t.layout.tpA8;
      case 'HalfLetter': return t.layout.tpHalfLetter;
      case 'BusinessCard_90x50': return t.layout.tpBusinessCard;
      case 'Card_85x55': return t.layout.tpCard85;
      case 'Photo_100x150': return t.layout.tpPhoto;
      default: return fallback;
    }
  };

  const virtualPages = useMemo(
    () => buildVirtualPageList(settings, sourcePDFInfo),
    [settings, sourcePDFInfo]
  );

  const courtesyPagesCount = useMemo(
    () => virtualPages.filter((p) => p.isSpacerBlank || p.sourcePageIndex === null).length,
    [virtualPages]
  );

  return (
    <div className="flex flex-col gap-3.5">
      {/* 1. SECCIÓN: HOJA DE IMPRESIÓN */}
      <div className="p-3.5 bg-neutral-50/90 rounded-xl border border-neutral-200/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/70">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-neutral-700" />
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-800">
              {t.layout.sheetSection}
            </span>
          </div>
          <span className="text-[10px] text-neutral-600 font-mono font-medium bg-white px-1.5 py-0.5 rounded border border-neutral-200/70">
            {settings.sheetWidth} × {settings.sheetHeight} mm
          </span>
        </div>

        {/* Tamaño del papel */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-neutral-600">{t.layout.sheetFormat}</label>
          <select
            value={settings.sheetPreset}
            onChange={handleSheetPresetChange}
            className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-medium focus:ring-1 focus:ring-neutral-400 focus:outline-hidden"
            id="sheet-preset"
          >
            {SHEET_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.label}
              </option>
            ))}
            <option value="Custom">{t.layout.customSheetOption}</option>
          </select>
        </div>

        {/* Orientación con botones claros */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-neutral-600">{t.layout.sheetOrientationLabel}</label>
          <div className="grid grid-cols-2 gap-1.5 bg-neutral-200/60 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => updateSetting('sheetOrientation', 'landscape')}
              className={`text-xs py-1.5 px-2 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                settings.sheetOrientation === 'landscape'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
              }`}
            >
              <span>{t.layout.landscape}</span>
              <span className="text-[10px] opacity-70">▭</span>
            </button>
            <button
              type="button"
              onClick={() => updateSetting('sheetOrientation', 'portrait')}
              className={`text-xs py-1.5 px-2 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                settings.sheetOrientation === 'portrait'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
              }`}
            >
              <span>{t.layout.portrait}</span>
              <span className="text-[10px] opacity-70">▯</span>
            </button>
          </div>
        </div>

        {/* Medidas personalizadas del pliego si aplica */}
        {settings.sheetPreset === 'Custom' && (
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-lg border border-neutral-200">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-mono">{t.layout.sheetWidthCustom}</label>
              <input
                type="number"
                value={settings.sheetWidth}
                onChange={(e) => updateSetting('sheetWidth', Math.max(10, Number(e.target.value)))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800"
                id="sheet-custom-width"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-mono">{t.layout.sheetHeightCustom}</label>
              <input
                type="number"
                value={settings.sheetHeight}
                onChange={(e) => updateSetting('sheetHeight', Math.max(10, Number(e.target.value)))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800"
                id="sheet-custom-height"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN: ESQUEMA DE IMPOSICIÓN */}
      <div className="p-3.5 bg-neutral-50/90 rounded-xl border border-neutral-200/90 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 pb-1.5 border-b border-neutral-200/70">
          <BookOpen className="w-3.5 h-3.5 text-neutral-700" />
          <span className="text-xs uppercase tracking-wider font-bold text-neutral-800">
            {t.layout.distributionScheme}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-neutral-600">{t.layout.impositionMode}</label>
          <select
            value={settings.layoutMode}
            onChange={(e) => {
              const val = e.target.value as LayoutMode;
              if (val === 'booklet') {
                onChangeSettings({
                  ...settings,
                  layoutMode: 'booklet',
                  gridCols: Math.max(2, settings.gridCols % 2 === 0 ? settings.gridCols : 2),
                  gridRows: Math.max(1, settings.gridRows),
                });
              } else {
                updateSetting('layoutMode', val);
              }
            }}
            className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
            id="layout-mode"
          >
            <option value="booklet">{t.layout.modeBooklet}</option>
            <option value="duplex_sheetwise">{t.layout.modeDuplex}</option>
            <option value="cut_and_stack">{t.layout.modeCutStack}</option>
            <option value="sequential">{t.layout.modeSequential}</option>
            <option value="step_and_repeat">{t.layout.modeRepeat}</option>
          </select>
        </div>

        {/* --- OPCIONES PARA BOOKLET --- */}
        {settings.layoutMode === 'booklet' ? (
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-neutral-600">
                {t.layout.bookletPagesPerSide}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { c: 2, r: 1, label: t.layout.booklet2up, desc: t.layout.bookletHalfSheet, minPages: 4 },
                  { c: 2, r: 2, label: t.layout.booklet4up, desc: t.layout.booklet4in1, minPages: 4 },
                  { c: 4, r: 2, label: t.layout.booklet8up, desc: t.layout.booklet8in1, minPages: 8 },
                ].map((preset) => {
                  const isSelected = settings.gridCols === preset.c && settings.gridRows === preset.r;
                  const isDisabled = Boolean(sourcePDFInfo && sourcePDFInfo.pageCount < preset.minPages);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={isDisabled}
                      title={isDisabled ? t.layout.requiresAtLeast.replace('{min}', String(preset.minPages)).replace('{has}', String(sourcePDFInfo?.pageCount ?? 0)) : preset.desc}
                      onClick={() => {
                        if (isDisabled) return;
                        onChangeSettings({
                          ...settings,
                          gridCols: preset.c,
                          gridRows: preset.r,
                          sheetOrientation: 'landscape',
                        });
                      }}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-center transition-all ${
                        isDisabled
                          ? 'opacity-35 bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs cursor-pointer'
                          : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200 cursor-pointer'
                      }`}
                    >
                      <span className="text-xs font-bold">{preset.label}</span>
                      <span className={`text-[9px] mt-0.5 truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        {isDisabled ? t.layout.incompatible : preset.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Booklet multi-row (corte horizontal) */}
            {settings.gridCols * settings.gridRows > 2 && (
              <div className="flex flex-col gap-1.5 p-2 bg-amber-50/70 rounded-lg border border-amber-200/80">
                <div className="flex items-center gap-1.5 text-amber-900">
                  <Scissors className="w-3.5 h-3.5 shrink-0" />
                  <label className="text-[11px] font-bold">
                    {t.layout.cutAndNestTitle.replace('{count}', String(settings.gridCols * settings.gridRows))}
                  </label>
                </div>
                <select
                  value={settings.booklet4UpMode || 'cut_and_nest'}
                  onChange={(e) => updateSetting('booklet4UpMode', e.target.value as Booklet4UpMode)}
                  className="bg-white border border-amber-300 rounded-md px-2 py-1 text-xs text-neutral-800 font-medium focus:outline-hidden"
                  id="booklet-4up-mode"
                >
                  <option value="cut_and_nest">{t.layout.modeContinuous}</option>
                  <option value="duplicate_2up">{t.layout.modeTwins}</option>
                  <option value="french_fold">{t.layout.modeFrenchFold}</option>
                </select>
              </div>
            )}

            {/* Encuadernación y Firmas */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-neutral-200/80">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 font-medium">{t.layout.spineBinding}</label>
                <select
                  value={settings.bindingEdge}
                  onChange={(e) => updateSetting('bindingEdge', e.target.value as BindingEdge)}
                  className="bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800 focus:outline-hidden font-medium"
                  id="binding-edge"
                >
                  <option value="left">{t.layout.bindingLeftOcc}</option>
                  <option value="right">{t.layout.bindingRightOri}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 font-medium">{t.layout.signatureSizeLabel}</label>
                <select
                  value={settings.signatureSize}
                  onChange={(e) => updateSetting('signatureSize', Number(e.target.value))}
                  className="bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800 focus:outline-hidden font-medium"
                  id="signature-size"
                >
                  <option value={0}>{t.layout.allPagesInOne}</option>
                  {[
                    { val: 4, label: t.layout.sig4 },
                    { val: 8, label: t.layout.sig8 },
                    { val: 16, label: t.layout.sig16 },
                    { val: 32, label: t.layout.sig32 },
                  ]
                    .filter((opt) => !sourcePDFInfo || sourcePDFInfo.pageCount >= opt.val)
                    .map((opt) => (
                      <option key={opt.val} value={opt.val}>
                        {opt.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Páginas Dobles Panorámicas / Manga Spreads */}
            <div className="p-2.5 bg-white rounded-lg border border-neutral-200/90 flex flex-col gap-1.5 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-base select-none mt-0.5">🎌</span>
                  <div>
                    <label htmlFor="split-double-spreads" className="text-xs font-bold text-neutral-800 cursor-pointer block leading-tight">
                      {t.layout.splitDoubleSpreads}
                    </label>
                    <p className="text-[10px] text-neutral-500 leading-normal mt-0.5">
                      {t.layout.splitDoubleSpreadsDesc}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="split-double-spreads"
                  checked={settings.splitDoubleSpreads || false}
                  onChange={(e) => updateSetting('splitDoubleSpreads', e.target.checked)}
                  className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-400 cursor-pointer mt-0.5 shrink-0"
                />
              </div>

              {sourcePDFInfo && (sourcePDFInfo.doublePageCount || 0) > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-1 rounded-md">
                    <Sparkles className="w-3 h-3 shrink-0 text-indigo-600" />
                    <span>
                      {t.layout.doublePagesDetected}: <strong>{sourcePDFInfo.doublePageCount}</strong> {sourcePDFInfo.doublePageCount === 1 ? t.layout.pageOne : t.layout.pageMany}
                    </span>
                  </div>
                  {courtesyPagesCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-md">
                      <FileText className="w-3 h-3 shrink-0 text-amber-600" />
                      <span>
                        {t.layout.courtesyPagesCount}: <strong>{courtesyPagesCount}</strong> {courtesyPagesCount === 1 ? t.layout.pageOne : t.layout.pageMany}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* --- OPCIONES PARA NO-BOOKLET --- */
          <div className="flex flex-col gap-3 pt-1">
            {/* Tamaño deseado del producto de corte */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-neutral-600">
                  {t.layout.cutSizeLabel}
                </label>
                {currentTarget.width > 0 && (
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {currentTarget.width.toFixed(1)} × {currentTarget.height.toFixed(1)} mm
                  </span>
                )}
              </div>
              <select
                value={settings.targetPagePreset}
                onChange={(e) => handleTargetPresetChange(e.target.value as TargetPagePreset)}
                className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-medium focus:ring-1 focus:ring-neutral-400 focus:outline-hidden"
                id="target-page-preset"
              >
                {TARGET_PAGE_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {targetPresetLabel(p.name, p.label)}
                  </option>
                ))}
              </select>
            </div>

            {/* Medidas personalizadas de corte */}
            {settings.targetPagePreset === 'Custom' && (
              <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-neutral-200">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 font-mono">{t.layout.cutWidth}</label>
                  <input
                    type="number"
                    value={settings.targetPageWidth}
                    onChange={(e) => updateSetting('targetPageWidth', Math.max(10, Number(e.target.value)))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800"
                    id="target-custom-width"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 font-mono">{t.layout.cutHeight}</label>
                  <input
                    type="number"
                    value={settings.targetPageHeight}
                    onChange={(e) => updateSetting('targetPageHeight', Math.max(10, Number(e.target.value)))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-800"
                    id="target-custom-height"
                  />
                </div>
              </div>
            )}

            {/* Columnas y Filas */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-600">{t.layout.columns}</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={settings.gridCols}
                  onChange={(e) => updateSetting('gridCols', Math.max(1, Math.min(16, Number(e.target.value))))}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-mono font-bold focus:outline-hidden"
                  id="grid-cols"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-600">{t.layout.rows}</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={settings.gridRows}
                  onChange={(e) => updateSetting('gridRows', Math.max(1, Math.min(16, Number(e.target.value))))}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-mono font-bold focus:outline-hidden"
                  id="grid-rows"
                />
              </div>
            </div>

            {/* Distribución Dúplex Sheetwise */}
            {settings.layoutMode === 'duplex_sheetwise' && (
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-lg border border-neutral-200">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 font-medium">{t.layout.duplexDistribution}</label>
                  <select
                    value={settings.duplexItemMode}
                    onChange={(e) => updateSetting('duplexItemMode', e.target.value as DuplexItemMode)}
                    className="bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-700 focus:outline-hidden"
                    id="duplex-item-mode"
                  >
                    <option value="two_page_items">{t.layout.duplexTwoSides}</option>
                    <option value="consecutive">{t.layout.duplexConsecutive}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 font-medium">{t.layout.fillOrder}</label>
                  <select
                    value={settings.gridOrder}
                    onChange={(e) => updateSetting('gridOrder', e.target.value as GridOrder)}
                    className="bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-700 focus:outline-hidden"
                    id="grid-order"
                  >
                    <option value="rows">{t.layout.fillRows}</option>
                    <option value="columns">{t.layout.fillColumns}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
