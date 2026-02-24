import type { WordPack } from '../types/game';
import { WORD_LIST } from '../data/words';
import { WORD_LIST_RU } from '../data/words-ru';

const packs: Record<WordPack, string[]> = {
  en: WORD_LIST,
  ru: WORD_LIST_RU,
};

export function getWordList(pack: WordPack): string[] {
  return packs[pack];
}
