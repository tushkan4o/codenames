import { createSeededRandom, hashString } from './seededRandom';
import { getWordList } from './wordPacks';
import type { BoardConfig, BoardState, CardColor, CardState, WordPack } from '../types/game';

export function generateBoard(seed: string, config: BoardConfig, wordPack: WordPack): BoardState {
  const numericSeed = hashString(seed);
  const random = createSeededRandom(numericSeed);

  const startingTeam: 'red' | 'blue' = random() < 0.5 ? 'red' : 'blue';

  const words = getWordList(wordPack);
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selectedWords = shuffled.slice(0, config.totalCards);

  // Build color array from config
  // Starting team gets redCount, other team gets blueCount
  const startCount = startingTeam === 'red' ? config.redCount : config.blueCount;
  const otherCount = startingTeam === 'red' ? config.blueCount : config.redCount;
  const otherTeam: CardColor = startingTeam === 'red' ? 'blue' : 'red';

  const colors: CardColor[] = [
    ...Array<CardColor>(startCount).fill(startingTeam),
    ...Array<CardColor>(otherCount).fill(otherTeam),
    ...Array<CardColor>(config.neutralCount).fill('neutral'),
    ...Array<CardColor>(config.assassinCount).fill('assassin'),
  ];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }

  const cards: CardState[] = selectedWords.map((word, i) => ({
    word,
    color: colors[i],
    revealed: false,
    position: i,
  }));

  return { seed, cards, startingTeam, config };
}

export function generateSeed(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${datePart}-${randomPart}`;
}
