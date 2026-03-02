import type { CardState } from '../types/game';

export type ClueErrorKey = 'errorEmpty' | 'errorMultiWord' | 'errorOnBoard' | 'errorNumber';

export interface ClueValidation {
  valid: boolean;
  errorKey?: ClueErrorKey;
}

export function validateClue(
  word: string,
  number: number,
  boardCards: CardState[],
): ClueValidation {
  const trimmed = word.trim().toUpperCase();

  if (!trimmed) {
    return { valid: false, errorKey: 'errorEmpty' };
  }

  if (/\s/.test(trimmed)) {
    return { valid: false, errorKey: 'errorMultiWord' };
  }

  if (boardCards.some((card) => card.word.toUpperCase() === trimmed)) {
    return { valid: false, errorKey: 'errorOnBoard' };
  }

  if (number < 0 || !Number.isInteger(number)) {
    return { valid: false, errorKey: 'errorNumber' };
  }

  return { valid: true };
}
