import { useI18n } from './I18nContext';

export function useTranslation() {
  const { translations } = useI18n();
  return { t: translations };
}
