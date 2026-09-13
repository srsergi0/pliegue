import React from 'react';
import { WORKSHOP_PRESETS, JobTemplate } from '../constants/jobPresets';
import { ImpositionSettings } from '../types';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ImpositionSettings;
  onApplyTemplate: (template: JobTemplate) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onApplyTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200/90 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200/80 bg-neutral-50/70 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                <span>Plantillas de Taller de 1 Clic</span>
                <span className="text-[10px] bg-neutral-900 text-white font-mono px-2 py-0.5 rounded-full font-semibold">
                  PRESETS
                </span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Configura pliego, grilla, sangrado y marcas en 1 clic según el producto de imprenta.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
            title="Cerrar modal"
            id="btn-close-templates-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Grid of Templates */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-neutral-100/40">
          {WORKSHOP_PRESETS.map((tmpl) => {
            const isMatch =
              currentSettings.layoutMode === tmpl.settings.layoutMode &&
              currentSettings.sheetPreset === tmpl.settings.sheetPreset &&
              currentSettings.gridCols === tmpl.settings.gridCols &&
              currentSettings.gridRows === tmpl.settings.gridRows;

            return (
              <div
                key={tmpl.id}
                onClick={() => {
                  onApplyTemplate(tmpl);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                  isMatch
                    ? 'bg-white border-amber-400/90 ring-2 ring-amber-400/30 shadow-sm'
                    : 'bg-white border-neutral-200/90 hover:border-neutral-400/80 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{tmpl.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 group-hover:text-amber-900 transition-colors">
                          {tmpl.title}
                        </h4>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                          {tmpl.category}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold bg-neutral-100 group-hover:bg-amber-100/70 text-neutral-700 group-hover:text-amber-900 px-2 py-0.5 rounded-md border border-neutral-200/60 transition-colors">
                      {tmpl.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed mb-3">
                    {tmpl.description}
                  </p>
                </div>

                {/* Technical Specs Pill */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5 text-[9.5px] font-mono text-neutral-500">
                    <span className="bg-neutral-100 px-1.5 py-0.5 rounded">
                      Pliego: {tmpl.settings.sheetPreset}
                    </span>
                    <span className="bg-neutral-100 px-1.5 py-0.5 rounded">
                      Grilla: {tmpl.settings.gridCols}×{tmpl.settings.gridRows}
                    </span>
                    <span className="bg-neutral-100 px-1.5 py-0.5 rounded">
                      {tmpl.settings.duplexMode === 'simplex' ? '1 Cara' : 'Dúplex'}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 group-hover:text-amber-700 transition-colors">
                    {isMatch ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Activo</span>
                      </span>
                    ) : (
                      <>
                        <span>Aplicar</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Note */}
        <div className="p-3.5 bg-white border-t border-neutral-200/80 text-center text-xs text-neutral-400 select-none">
          💡 Puedes aplicar una plantilla antes o después de cargar tu PDF. Todo se adapta automáticamente.
        </div>
      </div>
    </div>
  );
};
