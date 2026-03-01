import { createContext, useContext, type ReactNode } from 'react';
import { ru, type TranslationKeys } from './ru';

interface I18nContextValue {
  translations: TranslationKeys;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ translations: ru }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
