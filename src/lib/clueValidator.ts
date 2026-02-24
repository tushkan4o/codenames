import type { CardState } from '../types/game';

export interface ClueValidation {
  valid: boolean;
  error?: string;
}

export function validateClue(
  word: string,
  number: number,
  boardCards: CardState[],
): ClueValidation {
  const trimmed = word.trim().toUpperCase();

  if (!trimmed) {
    return { valid: false, error: 'Clue cannot be empty' };
  }

  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'Clue must be a single word' };
  }

  if (boardCards.some((card) => card.word.toUpperCase() === trimmed)) {
    return { valid: false, error: 'Clue cannot be a word on the board' };
  }

  if (number < 1 || !Number.isInteger(number)) {
    return { valid: false, error: 'Select at least one target word' };
  }

  return { valid: true };
}
