import React, { DragEvent } from 'react';
import { Upload, RefreshCw, FileCode, AlertCircle, FileUp, Sparkles } from 'lucide-react';
import { WORKSHOP_PRESETS, JobTemplate } from '../constants/jobPresets';
import { Button } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';

interface WelcomeScreenProps {
  errorMsg: string | null;
  parsing: boolean;
  dragOver: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onOpenFile: () => void;
  onApplyTemplate: (tmpl: JobTemplate) => void;
  onOpenTemplates: () => void;
  onLoadSample: (pageCount: number) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  errorMsg,
  parsing,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenFile,
  onApplyTemplate,
  onOpenTemplates,
  onLoadSample,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full min-w-0">
      {/* Title intro */}
      <div className="text-center mb-8 max-w-lg select-none">
        <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight mb-2">
          {t.welcome.heroTitle}
        </h2>
        <p className="text-xs text-neutral-500 leading-relaxed">
          {t.welcome.heroDescription}
        </p>
      </div>

      {/* Error badge */}
      {errorMsg && (
        <div className="mb-4 w-full max-w-md bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-xs flex gap-2.5 items-center select-none">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Central Drop Zone Card */}
      <div
        onClick={onOpenFile}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full max-w-xl aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all duration-200 relative cursor-pointer ${dragOver
          ? 'border-amber-500 bg-amber-50/60 ring-4 ring-amber-500/20 scale-[1.01]'
          : 'border-neutral-300 hover:border-neutral-400 bg-white shadow-xs'
          }`}
      >
        {parsing ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-neutral-400" />
            <div>
              <p className="text-xs font-semibold text-neutral-700">{t.welcome.analyzingPdf}</p>
              <p className="text-[10px] text-neutral-400">{t.welcome.analyzingPdfSubtitle}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 select-none">
            <div className={`p-3 rounded-full transition-all ${dragOver ? 'bg-amber-100 text-amber-600 scale-110' : 'bg-neutral-100 text-neutral-500'}`}>
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-700">
                {dragOver ? (
                  <span className="text-amber-700 font-bold text-sm">{t.actions.dropPdfActive}</span>
                ) : (
                  <>
                    {t.actions.dropPdfHere} <span className="text-neutral-950 underline decoration-2">{t.welcome.browseInPc}</span>
                  </>
                )}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">{t.welcome.dragDropSubtitle}</p>
            </div>

            <Button
              variant="primary"
              size="smWide"
              className="mt-1"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFile();
              }}
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{t.actions.selectPdfFile}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Quick Templates Suggestion Bar */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 select-none">
        <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>{t.welcome.popularTemplates}</span>
        </span>
        {WORKSHOP_PRESETS.slice(0, 4).map((tmpl) => {
          const loc = t.templates.presets[tmpl.id];
          return (
            <Button
              key={tmpl.id}
              variant="outline"
              size="smWide"
              onClick={() => onApplyTemplate(tmpl)}
              title={loc?.description ?? tmpl.description}
            >
              <span>{tmpl.icon}</span>
              <span>{loc?.badge ?? tmpl.badge}</span>
            </Button>
          );
        })}
        <Button variant="amberSubtle" size="smWide" onClick={onOpenTemplates}>
          {t.welcome.viewAll} →
        </Button>
      </div>

      {/* Demo test section */}
      <div className="mt-6 flex flex-col items-center gap-2 select-none">
        <span className="text-[11px] text-neutral-400">{t.welcome.noPdfPrompt}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="soft"
            size="lg"
            onClick={() => onLoadSample(8)}
            disabled={parsing}
            id="btn-sample-pdf-8"
          >
            <FileCode className="w-3.5 h-3.5 text-neutral-500" />
            <span>{t.welcome.generate8}</span>
          </Button>
          <Button
            variant="soft"
            size="lg"
            onClick={() => onLoadSample(16)}
            disabled={parsing}
            id="btn-sample-pdf-16"
          >
            <FileCode className="w-3.5 h-3.5 text-neutral-500" />
            <span>{t.welcome.generate16}</span>
          </Button>
          <Button
            variant="soft"
            size="lg"
            onClick={() => onLoadSample(32)}
            disabled={parsing}
            id="btn-sample-pdf-32"
          >
            <FileCode className="w-3.5 h-3.5 text-neutral-500" />
            <span>{t.welcome.generate32}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
