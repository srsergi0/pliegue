import React, { useState } from 'react';
import { ImpositionSettings, PDFSourceInfo } from '../types';
import { Package, Layers, LayoutGrid, Printer, Crop } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { JobSummary } from './control-panel/JobSummary';
import { StepSection } from './control-panel/StepSection';
import { ProductStep } from './control-panel/steps/ProductStep';
import { SheetStep } from './control-panel/steps/SheetStep';
import { DistributionStep } from './control-panel/steps/DistributionStep';
import { AdjustmentsTab } from './control-panel/AdjustmentsTab';
import { MarginsTab } from './control-panel/MarginsTab';

interface ControlPanelProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
  sourcePDFInfo: PDFSourceInfo | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onChangeSettings,
  sourcePDFInfo,
}) => {
  const { t } = useI18n();

  // Core steps open by default; Print and Finishing start collapsed to keep
  // the panel short. The summary chips reveal any step on demand.
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({
    'step-product': true,
    'step-sheet': true,
    'step-distribution': true,
    'step-print': false,
    'step-finishing': false,
  });

  const toggleStep = (id: string) =>
    setOpenSteps((prev) => ({ ...prev, [id]: !prev[id] }));

  const jumpToStep = (id: string) => {
    setOpenSteps((prev) => ({ ...prev, [id]: true }));
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="flex flex-col bg-white rounded-xl border border-neutral-200/90 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex-1 min-h-0 overflow-hidden">
      {/* Resumen del trabajo (chips navegables) */}
      <JobSummary settings={settings} sourcePDFInfo={sourcePDFInfo} onJump={jumpToStep} />

      {/* 3. Flujo lineal por pasos */}
      <div id="control-panel-scroll" className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
        <StepSection
          id="step-product"
          index={1}
          title={t.steps.product}
          hint={t.steps.productHint}
          icon={<Package className="w-3.5 h-3.5" />}
          open={openSteps['step-product']}
          onToggle={() => toggleStep('step-product')}
        >
          <ProductStep settings={settings} onChangeSettings={onChangeSettings} />
        </StepSection>

        <StepSection
          id="step-sheet"
          index={2}
          title={t.steps.sheet}
          hint={t.steps.sheetHint}
          icon={<Layers className="w-3.5 h-3.5" />}
          open={openSteps['step-sheet']}
          onToggle={() => toggleStep('step-sheet')}
        >
          <SheetStep
            settings={settings}
            onChangeSettings={onChangeSettings}
            sourcePDFInfo={sourcePDFInfo}
          />
        </StepSection>

        <StepSection
          id="step-distribution"
          index={3}
          title={t.steps.distribution}
          hint={t.steps.distributionHint}
          icon={<LayoutGrid className="w-3.5 h-3.5" />}
          open={openSteps['step-distribution']}
          onToggle={() => toggleStep('step-distribution')}
        >
          <DistributionStep
            settings={settings}
            onChangeSettings={onChangeSettings}
            sourcePDFInfo={sourcePDFInfo}
          />
        </StepSection>

        <StepSection
          id="step-print"
          index={4}
          title={t.steps.print}
          hint={t.steps.printHint}
          icon={<Printer className="w-3.5 h-3.5" />}
          open={openSteps['step-print']}
          onToggle={() => toggleStep('step-print')}
        >
          <AdjustmentsTab settings={settings} onChangeSettings={onChangeSettings} />
        </StepSection>

        <StepSection
          id="step-finishing"
          index={5}
          title={t.steps.finishing}
          hint={t.steps.finishingHint}
          icon={<Crop className="w-3.5 h-3.5" />}
          open={openSteps['step-finishing']}
          onToggle={() => toggleStep('step-finishing')}
        >
          <MarginsTab settings={settings} onChangeSettings={onChangeSettings} />
        </StepSection>
      </div>
    </div>
  );
};
