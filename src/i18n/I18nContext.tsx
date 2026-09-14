import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Language, Translations } from './types';
import { es } from './locales/es';
import { en } from './locales/en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const translationsMap: Record<Language, Translations> = {
  es,
  en,
};

const STORAGE_KEY = 'pliegue_language';

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // 1. Check saved language preference in localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === 'es' || saved === 'en')) {
        return saved;
      }
      // 2. Default to system/browser language
      const systemLang = navigator.language?.toLowerCase() || '';
      if (systemLang.startsWith('es')) {
        return 'es';
      }
    }
    return 'es'; // default to Spanish
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // localStorage might be unavailable in certain sandboxes
      }
    }
  };

  const t = useMemo(() => translationsMap[language] || es, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
