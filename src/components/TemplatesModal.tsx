import React, { useState } from 'react';
import { WORKSHOP_PRESETS, JobTemplate } from '../constants/jobPresets';
import { ImpositionSettings } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { Sparkles, X, Check, ArrowRight, Save, Trash2, Star } from 'lucide-react';
import { Button, IconButton, Input } from './ui';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ImpositionSettings;
  onApplyTemplate: (template: JobTemplate) => void;
  customTemplates: JobTemplate[];
  onSaveCustom: (name: string) => string | null;
  onDeleteCustom: (id: string) => void;
}

function TemplateCard({
  tmpl,
  isMatch,
  isCustom,
  onApply,
  onDelete,
  deleteLabel,
}: {
  key?: React.Key;
  tmpl: JobTemplate;
  isMatch: boolean;
  isCustom?: boolean;
  onApply: () => void;
  onDelete?: () => void;
  deleteLabel: string;
}) {
  const { t } = useI18n();
  const loc = t.templates.presets[tmpl.id];
  const title = loc?.title ?? tmpl.title;
  const description = loc?.description ?? tmpl.description;
  const category =
    tmpl.category === 'Personalizada' ? t.templates.customCategory : (loc?.category ?? tmpl.category);
  const badge = loc?.badge ?? tmpl.badge;
  return (
    <div
      onClick={onApply}
      className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between group relative ${
        isMatch
          ? 'bg-white border-amber-400/90 ring-2 ring-amber-400/30 shadow-sm'
          : 'bg-white border-neutral-200/90 hover:border-neutral-400/80 hover:shadow-md'
      }`}
    >
      {isCustom && onDelete && (
        <IconButton
          tone="danger"
          size="lg"
          className="absolute top-2.5 right-2.5 text-neutral-300"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title={deleteLabel}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>
      )}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl group-hover:scale-110 transition-transform">{tmpl.icon}</span>
            <div>
              <h4 className="text-xs font-bold text-neutral-900 group-hover:text-amber-900 transition-colors">
                {title}
              </h4>
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                {category}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold bg-neutral-100 group-hover:bg-amber-100/70 text-neutral-700 group-hover:text-amber-900 px-2 py-0.5 rounded-md border border-neutral-200/60 transition-colors shrink-0">
            {badge}
          </span>
        </div>

        <p className="text-[11px] text-neutral-500 leading-relaxed mb-3">
          {description}
        </p>
      </div>

      {/* Technical Specs Pill */}
      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5 text-[9.5px] font-mono text-neutral-500">
          <span className="bg-neutral-100 px-1.5 py-0.5 rounded">
            {t.templates.sheetWord}: {tmpl.settings.sheetPreset}
          </span>
          <span className="bg-neutral-100 px-1.5 py-0.5 rounded">
            {t.templates.gridWord}: {tmpl.settings.gridCols}×{tmpl.settings.gridRows}
          </span>
          <span className="bg-neutral-100 px-1.5 py-0.5 rounded">
            {tmpl.settings.duplexMode === 'simplex' ? t.templates.duplexSingle : t.templates.duplexDouble}
          </span>
        </div>

        <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 group-hover:text-amber-700 transition-colors">
            {isMatch ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>{t.templates.activeLabel}</span>
              </span>
            ) : (
              <>
                <span>{t.templates.applyLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onApplyTemplate,
  customTemplates,
  onSaveCustom,
  onDeleteCustom,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMatchFor = (tmpl: JobTemplate) =>
    currentSettings.layoutMode === tmpl.settings.layoutMode &&
    currentSettings.sheetPreset === tmpl.settings.sheetPreset &&
    currentSettings.gridCols === tmpl.settings.gridCols &&
    currentSettings.gridRows === tmpl.settings.gridRows;

  const handleSave = () => {
    const err = onSaveCustom(name);
    if (err) {
      setFormError(err);
    } else {
      setName('');
      setFormError(null);
    }
  };

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
                <span>{t.templates.modalTitle}</span>
                <span className="text-[10px] bg-neutral-900 text-white font-mono px-2 py-0.5 rounded-full font-semibold">
                  PRESETS
                </span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {t.templates.modalSubtitle}
              </p>
            </div>
          </div>
          <IconButton
            tone="neutral"
            size="lg"
            onClick={onClose}
            title={t.templates.close}
            id="btn-close-templates-modal"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        <div className="overflow-y-auto bg-neutral-100/40">
          {/* Save current setup */}
          <div className="p-5 pb-3">
            <div className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <Save className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-neutral-900">{t.templates.saveSectionTitle}</h4>
              </div>
              <p className="text-[11px] text-neutral-500 mb-3">{t.templates.saveSectionDesc}</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={name}
                  maxLength={60}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                  }}
                  placeholder={t.templates.savePlaceholder}
                  className="flex-1 border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 bg-neutral-50/50 placeholder:text-neutral-400"
                  id="input-custom-template-name"
                />
                <Button
                  variant="primary"
                  size="smWide"
                  className="shrink-0"
                  onClick={handleSave}
                  disabled={!name.trim()}
                  id="btn-save-custom-template"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.templates.saveButton}</span>
                </Button>
              </div>
              {formError && (
                <p className="text-[11px] text-red-600 mt-2">{formError}</p>
              )}
            </div>
          </div>

          {/* Custom templates */}
          <div className="px-5 pt-1 pb-2">
            <div className="flex items-center gap-1.5 mb-2.5 select-none">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <h4 className="text-xs font-bold text-neutral-800">
                {t.templates.customSectionTitle}
                <span className="ml-1.5 text-[10px] font-mono font-semibold bg-neutral-200/70 text-neutral-600 px-1.5 py-0.5 rounded">
                  {customTemplates.length}
                </span>
              </h4>
            </div>
            {customTemplates.length === 0 ? (
              <p className="text-[11px] text-neutral-400 bg-white/60 border border-dashed border-neutral-200 rounded-xl px-4 py-3.5 text-center select-none">
                {t.templates.customEmpty}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {customTemplates.map((tmpl) => (
                  <TemplateCard
                    key={tmpl.id}
                    tmpl={tmpl}
                    isMatch={isMatchFor(tmpl)}
                    isCustom
                    deleteLabel={t.templates.deleteTemplate}
                    onDelete={() => onDeleteCustom(tmpl.id)}
                    onApply={() => {
                      onApplyTemplate(tmpl);
                      onClose();
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Workshop presets */}
          <div className="p-5 pt-3">
            <h4 className="text-xs font-bold text-neutral-800 mb-2.5 select-none">
              {t.templates.workshopSectionTitle}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {WORKSHOP_PRESETS.map((tmpl) => (
                <TemplateCard
                  key={tmpl.id}
                  tmpl={tmpl}
                  isMatch={isMatchFor(tmpl)}
                  deleteLabel={t.templates.deleteTemplate}
                  onApply={() => {
                    onApplyTemplate(tmpl);
                    onClose();
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="p-3.5 bg-white border-t border-neutral-200/80 text-center text-xs text-neutral-400 select-none">
          {t.templates.footerNote}
        </div>
      </div>
    </div>
  );
};
