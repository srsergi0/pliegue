import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Language, Translations } from './types';
import { es } from './locales/es';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { zh } from './locales/zh';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  systemLanguage: Language;
  t: Translations;
}

const translationsMap: Record<Language, Translations> = {
  es,
  en,
  ja,
  zh,
};

const STORAGE_KEY = 'pliegue_language';

export function normalizeToSupportedLanguage(localeStr?: string | null): Language | null {
  if (!localeStr) return null;
  const lower = localeStr.toLowerCase().trim();
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('en')) return 'en';
  return null;
}

export function detectSystemLanguage(): Language {
  if (typeof window === 'undefined') return 'es';

  // 1. Intl API (queries OS regional formats, e.g. 'es-PE' on user's system)
  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    const matched = normalizeToSupportedLanguage(intlLocale);
    if (matched) return matched;
  } catch {
    // Ignore error
  }

  // 2. Navigator languages array
  if (Array.isArray(navigator.languages)) {
    for (const l of navigator.languages) {
      const matched = normalizeToSupportedLanguage(l);
      if (matched) return matched;
    }
  }

  // 3. Navigator language
  if (navigator.language) {
    const matched = normalizeToSupportedLanguage(navigator.language);
    if (matched) return matched;
  }

  return 'es';
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemLanguage = useMemo(() => detectSystemLanguage(), []);

  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === 'es' || saved === 'en' || saved === 'ja' || saved === 'zh')) {
        return saved;
      }
    }
    // Automatically match system language
    return detectSystemLanguage();
  });

  // Query native Electron system locale if available
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.getSystemLocale) {
      window.electronAPI.getSystemLocale().then((electronLocale) => {
        const matched = normalizeToSupportedLanguage(electronLocale);
        const hasSaved = localStorage.getItem(STORAGE_KEY);
        if (matched && !hasSaved) {
          setLanguageState(matched);
        }
      }).catch(() => {});
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Ignore quota/sandbox errors
      }
    }
  };

  const t = useMemo(() => translationsMap[language] || es, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      systemLanguage,
      t,
    }),
    [language, systemLanguage, t]
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
