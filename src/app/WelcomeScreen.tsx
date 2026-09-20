import React, { DragEvent } from 'react';
import { Upload, RefreshCw, FileCode, AlertCircle, FileUp } from 'lucide-react';
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
  onLoadSample,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-8 max-w-3xl mx-auto w-full">

        {/* Hero */}
        <div className="text-center mb-7 max-w-xl select-none">
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight mb-2">
            {t.welcome.heroTitle}
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {t.welcome.heroDescription}
          </p>
        </div>

        {/* Error badge */}
        {errorMsg && (
          <div className="mb-5 w-full bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-xs flex gap-2.5 items-center select-none">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`w-full rounded-2xl border-2 border-dashed transition-all duration-200 ${
            dragOver
              ? 'border-amber-500 bg-amber-50/60 ring-4 ring-amber-500/20'
              : 'border-neutral-300 bg-white shadow-xs'
          }`}
        >
          {parsing ? (
            <div className="flex items-center justify-center gap-3 py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
              <div className="text-left">
                <p className="text-xs font-semibold text-neutral-700">{t.welcome.analyzingPdf}</p>
                <p className="text-[10px] text-neutral-400">{t.welcome.analyzingPdfSubtitle}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 px-6 py-8">
              <div
                className={`p-3.5 rounded-2xl shrink-0 transition-all ${
                  dragOver ? 'bg-amber-100 text-amber-600 scale-110' : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                <Upload className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-sm font-bold text-neutral-800">
                  {dragOver ? (
                    <span className="text-amber-700">{t.actions.dropPdfActive}</span>
                  ) : (
                    t.welcome.dropTitle
                  )}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{t.welcome.dragDropSubtitle}</p>
              </div>
              <Button variant="primary" size="lg" className="shrink-0" onClick={onOpenFile}>
                <FileUp className="w-3.5 h-3.5" />
                <span>{t.actions.selectPdfFile}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Quick start */}
        <div className="mt-6 w-full flex flex-col gap-4">

          {/* Sample documents */}
          <section className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-500 shrink-0">
                <FileCode className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-neutral-800">{t.welcome.noPdfPrompt}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="soft"
                size="smWide"
                onClick={() => onLoadSample(8)}
                disabled={parsing}
                id="btn-sample-pdf-8"
              >
                <FileCode className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t.welcome.generate8}</span>
              </Button>
              <Button
                variant="soft"
                size="smWide"
                onClick={() => onLoadSample(16)}
                disabled={parsing}
                id="btn-sample-pdf-16"
              >
                <FileCode className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t.welcome.generate16}</span>
              </Button>
              <Button
                variant="soft"
                size="smWide"
                onClick={() => onLoadSample(32)}
                disabled={parsing}
                id="btn-sample-pdf-32"
              >
                <FileCode className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t.welcome.generate32}</span>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
