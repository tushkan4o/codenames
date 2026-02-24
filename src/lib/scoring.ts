import type { CardState } from '../types/game';

export function computeGuessScore(
  guessedIndices: number[],
  cards: CardState[],
): number {
  let score = 0;

  for (const idx of guessedIndices) {
    const card = cards[idx];
    if (card.color === 'assassin') return 0;
    if (card.color === 'red') score += 1;
    else if (card.color === 'blue') score -= 1;
    // neutral: no change
  }

  return Math.max(0, score);
}
