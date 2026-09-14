import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-neutral-100/90 hover:bg-neutral-200/80 border border-neutral-200/90 rounded-lg p-1 text-xs font-medium transition-all select-none shadow-2xs ${className}`}
      title={t.language.selectLanguage}
    >
      <Globe className="w-3.5 h-3.5 text-neutral-500 ml-1 shrink-0" />
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setLanguage('es')}
          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
            language === 'es'
              ? 'bg-white text-neutral-950 shadow-xs ring-1 ring-neutral-200/80'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
          aria-label="Cambiar idioma a Español"
        >
          ES
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-white text-neutral-950 shadow-xs ring-1 ring-neutral-200/80'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
          aria-label="Switch language to English"
        >
          EN
        </button>
      </div>
    </div>
  );
};
