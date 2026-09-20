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

  // Query the native Electron system language if available. The user's saved
  // preference always wins; only on a fresh install (no saved value) do we
  // follow the OS: first the preferred-languages list, then the single locale.
  useEffect(() => {
    const api = window.electronAPI;
    if (typeof window === 'undefined' || !api) return;

    // Explicit user preference: never override it.
    if (localStorage.getItem(STORAGE_KEY)) return;

    let active = true;
    (async () => {
      try {
        if (api.getPreferredLanguages) {
          const preferred = await api.getPreferredLanguages();
          for (const locale of preferred || []) {
            const matched = normalizeToSupportedLanguage(locale);
            if (matched) {
              if (active) setLanguageState(matched);
              return;
            }
          }
        }
        if (api.getSystemLocale) {
          const locale = await api.getSystemLocale();
          const matched = normalizeToSupportedLanguage(locale);
          if (matched && active) setLanguageState(matched);
        }
      } catch {
        // Ignore: browser detection already provided a fallback.
      }
    })();

    return () => {
      active = false;
    };
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
