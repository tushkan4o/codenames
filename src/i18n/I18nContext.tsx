import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Language } from '../types/game';
import { en, type TranslationKeys } from './en';
import { ru } from './ru';

const translations: Record<Language, TranslationKeys> = { en, ru };

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  translations: TranslationKeys;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('codenames_language');
    return (stored === 'ru' ? 'ru' : 'en') as Language;
  });

  function handleSetLanguage(lang: Language) {
    setLanguage(lang);
    localStorage.setItem('codenames_language', lang);
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, translations: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
