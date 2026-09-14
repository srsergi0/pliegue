import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Language } from '../i18n/types';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
}

const LANGUAGES: { code: Language; label: string; name: string }[] = [
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ja', label: 'JA', name: '日本語' },
  { code: 'zh', label: 'ZH', name: '简体中文' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center gap-1 bg-neutral-100/90 hover:bg-neutral-200/80 border border-neutral-200/90 rounded-lg p-1 text-xs font-medium transition-all select-none shadow-2xs ${className}`}
      title={t.language.selectLanguage}
    >
      <Globe className="w-3.5 h-3.5 text-neutral-500 ml-1 mr-0.5 shrink-0" />
      <div className="flex items-center gap-0.5">
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-neutral-950 shadow-xs ring-1 ring-neutral-200/80 font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title={lang.name}
              aria-label={lang.name}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
