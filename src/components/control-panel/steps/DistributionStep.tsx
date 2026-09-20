import React, { useMemo } from 'react';
import {
  ImpositionSettings,
  TARGET_PAGE_PRESETS,
  TargetPagePreset,
  GridOrder,
  BindingEdge,
  DuplexItemMode,
  PDFSourceInfo,
  Booklet4UpMode,
} from '../../../types';
import {
  calculateOptimalTargetLayout,
  resolveTargetPageDimensions,
  buildVirtualPageList,
} from '../../../utils/imposition';
import { Scissors, Sparkles, FileText } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nContext';
import { Select, NumberField, Checkbox } from '../../ui';

interface DistributionStepProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
  sourcePDFInfo: PDFSourceInfo | null;
}

/**
 * Step 3 — How pages are distributed on the sheet: pages per side, binding,
 * signatures, panoramic spreads, or the cut grid for non-booklet modes.
 */
export const DistributionStep: React.FC<DistributionStepProps> = ({
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
    <div className="flex flex-col gap-3">
      {settings.layoutMode === 'booklet' ? (
        /* --- OPCIONES PARA BOOKLET --- */
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-neutral-600">
              {t.layout.bookletPagesPerSide}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { c: 2, r: 1, label: t.layout.booklet2up, desc: t.layout.bookletHalfSheet, minPages: 4 },
                { c: 2, r: 2, label: t.layout.booklet4up, desc: t.layout.booklet4in1, minPages: 4 },
                { c: 4, r: 2, label: t.layout.booklet8up, desc: t.layout.booklet8in1, minPages: 8 },
                { c: 4, r: 4, label: t.layout.booklet16up, desc: t.layout.booklet16in1, minPages: 16 },
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
                      const leavingFrenchFold =
                        settings.booklet4UpMode === 'french_fold' &&
                        !(preset.c === 2 && preset.r === 2);
                      onChangeSettings({
                        ...settings,
                        gridCols: preset.c,
                        gridRows: preset.r,
                        sheetOrientation: 'landscape',
                        ...(leavingFrenchFold ? { booklet4UpMode: 'cut_and_nest' as const } : {}),
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
              <Select
                variant="amber"
                value={settings.booklet4UpMode || 'cut_and_nest'}
                onChange={(e) => updateSetting('booklet4UpMode', e.target.value as Booklet4UpMode)}
                id="booklet-4up-mode"
              >
                <option value="cut_and_nest">{t.layout.modeContinuous}</option>
                <option value="duplicate_2up">{t.layout.modeTwins}</option>
                {settings.gridCols === 2 && settings.gridRows === 2 && (
                  <option value="french_fold">{t.layout.modeFrenchFold}</option>
                )}
              </Select>
            </div>
          )}

          {/* Encuadernación y Firmas */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-neutral-200/80">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-medium">{t.layout.spineBinding}</label>
              <Select
                variant="subtle"
                value={settings.bindingEdge}
                onChange={(e) => updateSetting('bindingEdge', e.target.value as BindingEdge)}
                id="binding-edge"
              >
                <option value="left">{t.layout.bindingLeftOcc}</option>
                <option value="right">{t.layout.bindingRightOri}</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 font-medium">{t.layout.signatureSizeLabel}</label>
              <Select
                variant="subtle"
                value={settings.signatureSize}
                onChange={(e) => updateSetting('signatureSize', Number(e.target.value))}
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
              </Select>
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
              <Checkbox
                variant="plain"
                id="split-double-spreads"
                checked={settings.splitDoubleSpreads || false}
                onChange={(e) => updateSetting('splitDoubleSpreads', e.target.checked)}
                className="mt-0.5 shrink-0"
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
        <div className="flex flex-col gap-3">
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
            <Select
              value={settings.targetPagePreset}
              onChange={(e) => handleTargetPresetChange(e.target.value as TargetPagePreset)}
              id="target-page-preset"
            >
              {TARGET_PAGE_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {targetPresetLabel(p.name, p.label)}
                </option>
              ))}
            </Select>
          </div>

          {/* Medidas personalizadas de corte */}
          {settings.targetPagePreset === 'Custom' && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-neutral-200">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 font-mono">{t.layout.cutWidth}</label>
                <NumberField
                  value={settings.targetPageWidth}
                  min={10}
                  onValueChange={(v) => updateSetting('targetPageWidth', v)}
                  id="target-custom-width"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 font-mono">{t.layout.cutHeight}</label>
                <NumberField
                  value={settings.targetPageHeight}
                  min={10}
                  onValueChange={(v) => updateSetting('targetPageHeight', v)}
                  id="target-custom-height"
                />
              </div>
            </div>
          )}

          {/* Columnas y Filas */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-neutral-600">{t.layout.columns}</label>
              <NumberField
                variant="outline"
                value={settings.gridCols}
                min={1}
                max={16}
                onValueChange={(v) => updateSetting('gridCols', v)}
                id="grid-cols"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-neutral-600">{t.layout.rows}</label>
              <NumberField
                variant="outline"
                value={settings.gridRows}
                min={1}
                max={16}
                onValueChange={(v) => updateSetting('gridRows', v)}
                id="grid-rows"
              />
            </div>
          </div>

          {/* Distribución Dúplex Sheetwise */}
          {settings.layoutMode === 'duplex_sheetwise' && (
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-lg border border-neutral-200">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 font-medium">{t.layout.duplexDistribution}</label>
                <Select
                  variant="subtle"
                  value={settings.duplexItemMode}
                  onChange={(e) => updateSetting('duplexItemMode', e.target.value as DuplexItemMode)}
                  id="duplex-item-mode"
                >
                  <option value="two_page_items">{t.layout.duplexTwoSides}</option>
                  <option value="consecutive">{t.layout.duplexConsecutive}</option>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 font-medium">{t.layout.fillOrder}</label>
                <Select
                  variant="subtle"
                  value={settings.gridOrder}
                  onChange={(e) => updateSetting('gridOrder', e.target.value as GridOrder)}
                  id="grid-order"
                >
                  <option value="rows">{t.layout.fillRows}</option>
                  <option value="columns">{t.layout.fillColumns}</option>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
