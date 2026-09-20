import React from 'react';
import {
  ImpositionSettings,
  SHEET_PRESETS,
  SheetSizePreset,
  PDFSourceInfo,
} from '../../../types';
import {
  calculateOptimalTargetLayout,
  resolveTargetPageDimensions,
} from '../../../utils/imposition';
import { useI18n } from '../../../i18n/I18nContext';
import { Select, NumberField, SegmentedButton } from '../../ui';

interface SheetStepProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
  sourcePDFInfo: PDFSourceInfo | null;
}

/**
 * Step 2 — Press sheet stock and orientation.
 */
export const SheetStep: React.FC<SheetStepProps> = ({
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

  return (
    <div className="flex flex-col gap-2.5">
      {/* Tamaño del papel */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-neutral-600">{t.layout.sheetFormat}</label>
          <span className="text-[10px] text-neutral-600 font-mono font-medium bg-white px-1.5 py-0.5 rounded border border-neutral-200/70">
            {settings.sheetWidth} × {settings.sheetHeight} mm
          </span>
        </div>
        <Select
          value={settings.sheetPreset}
          onChange={handleSheetPresetChange}
          id="sheet-preset"
        >
          {SHEET_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.label}
            </option>
          ))}
          <option value="Custom">{t.layout.customSheetOption}</option>
        </Select>
      </div>

      {/* Orientación con botones claros */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-neutral-600">{t.layout.sheetOrientationLabel}</label>
        <div className="grid grid-cols-2 gap-1.5 bg-neutral-200/60 p-1 rounded-lg">
          <SegmentedButton
            active={settings.sheetOrientation === 'landscape'}
            size="wide"
            onClick={() => updateSetting('sheetOrientation', 'landscape')}
          >
            <span>{t.layout.landscape}</span>
            <span className="text-[10px] opacity-70">▭</span>
          </SegmentedButton>
          <SegmentedButton
            active={settings.sheetOrientation === 'portrait'}
            size="wide"
            onClick={() => updateSetting('sheetOrientation', 'portrait')}
          >
            <span>{t.layout.portrait}</span>
            <span className="text-[10px] opacity-70">▯</span>
          </SegmentedButton>
        </div>
      </div>

      {/* Medidas personalizadas del pliego si aplica */}
      {settings.sheetPreset === 'Custom' && (
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-lg border border-neutral-200">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-500 font-mono">{t.layout.sheetWidthCustom}</label>
            <NumberField
              value={settings.sheetWidth}
              min={10}
              onValueChange={(v) => updateSetting('sheetWidth', v)}
              id="sheet-custom-width"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-500 font-mono">{t.layout.sheetHeightCustom}</label>
            <NumberField
              value={settings.sheetHeight}
              min={10}
              onValueChange={(v) => updateSetting('sheetHeight', v)}
              id="sheet-custom-height"
            />
          </div>
        </div>
      )}
    </div>
  );
};
