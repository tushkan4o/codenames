import { useI18n } from './I18nContext';

export function useTranslation() {
  const { translations, language, setLanguage } = useI18n();
  return { t: translations, language, setLanguage };
}
