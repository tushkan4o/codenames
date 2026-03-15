export const WORD_PACK_LABELS: Record<string, string> = {
  'ru': 'RU by Collin',
  'ru-default': 'RU обычный',
  'en': 'EN default',
};

export const WORD_PACK_ORDER = ['ru', 'ru-default', 'en'] as const;

export type WordPackId = (typeof WORD_PACK_ORDER)[number];

/** Cycle to the next word pack in the list */
export function nextWordPack(current: string): WordPackId {
  const idx = WORD_PACK_ORDER.indexOf(current as WordPackId);
  return WORD_PACK_ORDER[(idx + 1) % WORD_PACK_ORDER.length];
}
