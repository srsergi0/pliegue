import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Sparkles, Download, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { Button, IconButton } from './ui';
import { UpdaterStatusData } from '../vite-env';

export const UpdateBanner: React.FC = () => {
  const { t } = useI18n();
  const [updateData, setUpdateData] = useState<UpdaterStatusData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.onUpdateStatus) {
      return;
    }

    const unsubscribe = window.electronAPI.onUpdateStatus((data: UpdaterStatusData) => {
      if (data.status === 'available') {
        setUpdateData(data);
        setDismissed(false);
      } else if (data.status === 'downloading') {
        setDownloading(true);
        setUpdateData(data);
      } else if (data.status === 'downloaded') {
        setDownloading(false);
        setUpdateData(data);
        setDismissed(false);
      } else if (data.status === 'error') {
        setDownloading(false);
        // Only log or show if desired, don't spam user
        console.warn('[Updater] status error:', data.message);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleStartDownload = async () => {
    setDownloading(true);
    try {
      await window.electronAPI?.downloadUpdate?.();
    } catch (err) {
      console.error('Error starting update download:', err);
      setDownloading(false);
    }
  };

  const handleInstallNow = () => {
    window.electronAPI?.quitAndInstall?.();
  };

  if (!updateData || dismissed || updateData.status === 'not-available' || updateData.status === 'checking') {
    return null;
  }

  // 1. Estado: Actualización descargada, lista para instalar
  if (updateData.status === 'downloaded') {
    return (
      <aside
        aria-label="Actualización lista para instalar"
        className="bg-emerald-900 text-white px-5 py-2.5 flex items-center justify-between text-xs z-50 animate-in slide-in-from-top-2 duration-200 select-none shadow-md"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-full bg-emerald-700/80 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
          </div>
          <div>
            <span className="font-bold mr-1.5">{t.updater.readyToInstall}</span>
            <span className="text-emerald-200 text-[11px] font-mono bg-emerald-800/80 px-1.5 py-0.5 rounded">
              v{updateData.version}
            </span>
            <span className="text-emerald-300 ml-2 hidden sm:inline text-[11px]">
              {t.updater.readyToInstallDesc}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="emeraldWhite"
            size="sm"
            onClick={handleInstallNow}
          >
            <RefreshCw className="w-3 h-3 text-emerald-700" />
            <span>{t.updater.restartAndInstall}</span>
          </Button>
          <IconButton
            tone="emeraldOnDark"
            size="sm"
            onClick={() => setDismissed(true)}
            title={t.updater.dismiss}
          >
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </aside>
    );
  }

  // 2. Estado: Descargando en segundo plano
  if (updateData.status === 'downloading' || downloading) {
    const percent = updateData.percent ?? 0;
    return (
      <aside
        aria-label="Descargando actualización"
        className="bg-neutral-900 text-white px-5 py-2 flex items-center justify-between text-xs z-50 animate-in slide-in-from-top-2 duration-200 select-none shadow-md"
      >
        <div className="flex items-center gap-3 w-full max-w-md">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
          <div className="w-full">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-neutral-200">{t.updater.downloading}</span>
              <span className="font-mono text-amber-400 font-bold">{percent}%</span>
            </div>
            <div className="w-full bg-neutral-700/80 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
              />
            </div>
          </div>
        </div>

        <IconButton
          tone="neutralOnDark"
          size="sm"
          className="ml-3"
          onClick={() => setDismissed(true)}
          title={t.updater.dismiss}
        >
          <X className="w-3.5 h-3.5" />
        </IconButton>
      </aside>
    );
  }

  // 3. Estado: Nueva versión disponible para descargar
  if (updateData.status === 'available') {
    return (
      <aside
        aria-label="Nueva versión disponible"
        className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white px-5 py-2.5 flex items-center justify-between text-xs z-50 animate-in slide-in-from-top-2 duration-200 select-none shadow-sm"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-100" />
          </div>
          <div>
            <span className="font-bold mr-1.5">{t.updater.updateAvailable}</span>
            <span className="text-amber-950 font-mono text-[11px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-2xs">
              v{updateData.version}
            </span>
            <span className="text-amber-100 ml-2 hidden sm:inline text-[11px]">
              {t.updater.updateAvailableDesc}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="dark"
            size="sm"
            onClick={handleStartDownload}
          >
            <Download className="w-3 h-3" />
            <span>{t.updater.downloadNow}</span>
          </Button>
          <IconButton
            tone="amberOnDark"
            size="sm"
            onClick={() => setDismissed(true)}
            title={t.updater.dismiss}
          >
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </aside>
    );
  }

  return null;
};
