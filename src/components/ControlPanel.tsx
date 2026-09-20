import React, { useState } from 'react';
import { ImpositionSettings, PDFSourceInfo } from '../types';
import { FileText, FolderOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n/I18nContext';
import { TabNavigation, TabType } from './control-panel/TabNavigation';
import { LayoutTab } from './control-panel/LayoutTab';
import { AdjustmentsTab } from './control-panel/AdjustmentsTab';
import { MarginsTab } from './control-panel/MarginsTab';
import { Button, IconButton } from './ui';

interface ControlPanelProps {
  settings: ImpositionSettings;
  onChangeSettings: (settings: ImpositionSettings) => void;
  sourcePDFInfo: PDFSourceInfo | null;
  onRemoveFile: () => void;
  onOpenNewFile?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onChangeSettings,
  sourcePDFInfo,
  onRemoveFile,
  onOpenNewFile,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('layout');

  return (
    <div className="flex flex-col bg-white rounded-xl border border-neutral-200/90 shadow-[0_2px_12px_rgb(0,0,0,0.03)] h-full overflow-hidden">
      {/* 1. Header con Información del Archivo PDF Cargado */}
      {sourcePDFInfo && (
        <div className="p-3 border-b border-neutral-200/80 bg-neutral-50/70 select-none">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-neutral-200/70 rounded-lg text-neutral-800 shrink-0 shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate" title={sourcePDFInfo.name}>
                  {sourcePDFInfo.name}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  {sourcePDFInfo.pageCount} {t.preview.sourcePages} • {(sourcePDFInfo.size / (1024 * 1024)).toFixed(2)} MB • {sourcePDFInfo.firstPageWidth.toFixed(0)}×{sourcePDFInfo.firstPageHeight.toFixed(0)} mm
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onOpenNewFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenNewFile}
                  className="text-[11px]"
                  title={t.actions.openAnotherTooltip}
                  id="btn-change-pdf"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{t.actions.openAnother}</span>
                </Button>
              )}
              <IconButton
                tone="danger"
                onClick={onRemoveFile}
                title={t.actions.closeNotification}
                id="btn-remove-file"
              >
                <X className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
        </div>
      )}

      {/* 2. Barra de Navegación de Pestañas Segmentada */}
      <TabNavigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        layoutBadge={`${settings.gridCols}×${settings.gridRows}`}
        duplexBadge={settings.duplexMode === 'simplex' ? '1C' : '2C'}
        marginBadge={settings.drawCropMarks ? t.tabs.guideBadge : undefined}
      />

      {/* 3. Contenedor de Pestañas con Transición Suave */}
      <div className="flex-1 overflow-y-auto p-3.5 md:p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'layout' && (
            <motion.div
              key="layout"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <LayoutTab
                settings={settings}
                onChangeSettings={onChangeSettings}
                sourcePDFInfo={sourcePDFInfo}
              />
            </motion.div>
          )}

          {activeTab === 'scaling' && (
            <motion.div
              key="scaling"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <AdjustmentsTab
                settings={settings}
                onChangeSettings={onChangeSettings}
              />
            </motion.div>
          )}

          {activeTab === 'margins' && (
            <motion.div
              key="margins"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <MarginsTab
                settings={settings}
                onChangeSettings={onChangeSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
