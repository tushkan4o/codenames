export interface Country {
  code: string;
  flag: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: 'RU', flag: '🇷🇺', name: 'Россия' },
  { code: 'UA', flag: '🇺🇦', name: 'Украина' },
  { code: 'BY', flag: '🇧🇾', name: 'Беларусь' },
  { code: 'KZ', flag: '🇰🇿', name: 'Казахстан' },
  { code: 'UZ', flag: '🇺🇿', name: 'Узбекистан' },
  { code: 'GE', flag: '🇬🇪', name: 'Грузия' },
  { code: 'AM', flag: '🇦🇲', name: 'Армения' },
  { code: 'AZ', flag: '🇦🇿', name: 'Азербайджан' },
  { code: 'MD', flag: '🇲🇩', name: 'Молдова' },
  { code: 'KG', flag: '🇰🇬', name: 'Кыргызстан' },
  { code: 'TJ', flag: '🇹🇯', name: 'Таджикистан' },
  { code: 'TM', flag: '🇹🇲', name: 'Туркменистан' },
  { code: 'LV', flag: '🇱🇻', name: 'Латвия' },
  { code: 'LT', flag: '🇱🇹', name: 'Литва' },
  { code: 'EE', flag: '🇪🇪', name: 'Эстония' },
  { code: 'PL', flag: '🇵🇱', name: 'Польша' },
  { code: 'DE', flag: '🇩🇪', name: 'Германия' },
  { code: 'FR', flag: '🇫🇷', name: 'Франция' },
  { code: 'IT', flag: '🇮🇹', name: 'Италия' },
  { code: 'ES', flag: '🇪🇸', name: 'Испания' },
  { code: 'GB', flag: '🇬🇧', name: 'Великобритания' },
  { code: 'US', flag: '🇺🇸', name: 'США' },
  { code: 'CA', flag: '🇨🇦', name: 'Канада' },
  { code: 'IL', flag: '🇮🇱', name: 'Израиль' },
  { code: 'TR', flag: '🇹🇷', name: 'Турция' },
  { code: 'CZ', flag: '🇨🇿', name: 'Чехия' },
  { code: 'FI', flag: '🇫🇮', name: 'Финляндия' },
  { code: 'SE', flag: '🇸🇪', name: 'Швеция' },
  { code: 'NO', flag: '🇳🇴', name: 'Норвегия' },
  { code: 'NL', flag: '🇳🇱', name: 'Нидерланды' },
  { code: 'PT', flag: '🇵🇹', name: 'Португалия' },
  { code: 'BR', flag: '🇧🇷', name: 'Бразилия' },
  { code: 'CN', flag: '🇨🇳', name: 'Китай' },
  { code: 'JP', flag: '🇯🇵', name: 'Япония' },
  { code: 'KR', flag: '🇰🇷', name: 'Южная Корея' },
  { code: 'IN', flag: '🇮🇳', name: 'Индия' },
  { code: 'AU', flag: '🇦🇺', name: 'Австралия' },
];

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}
