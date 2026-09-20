import React from 'react';
import { ImpositionSettings, LayoutMode } from '../../../types';
import { useI18n } from '../../../i18n/I18nContext';
import { Select } from '../../ui';

interface ProductStepProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
}

/**
 * Step 1 — What the job is: imposition mode / finished product.
 */
export const ProductStep: React.FC<ProductStepProps> = ({
  settings,
  onChangeSettings,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-neutral-600">{t.layout.impositionMode}</label>
      <Select
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
            onChangeSettings({ ...settings, layoutMode: val });
          }
        }}
        id="layout-mode"
      >
        <option value="booklet">{t.layout.modeBooklet}</option>
        <option value="duplex_sheetwise">{t.layout.modeDuplex}</option>
        <option value="cut_and_stack">{t.layout.modeCutStack}</option>
        <option value="sequential">{t.layout.modeSequential}</option>
        <option value="step_and_repeat">{t.layout.modeRepeat}</option>
      </Select>
    </div>
  );
};
