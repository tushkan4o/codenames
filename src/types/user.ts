import type { BoardSize } from './game';

export interface User {
  id: string;
  displayName: string;
  createdAt: number;
  preferences: UserPreferences;
  isAdmin: boolean;
}

export type CardFontSize = 'sm' | 'md' | 'lg';

export interface UserPreferences {
  defaultBoardSize: BoardSize;
  animationEnabled: boolean;
  revealDuration: number;
  cardFontSize: CardFontSize;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultBoardSize: '5x5',
  animationEnabled: true,
  revealDuration: 1000,
  cardFontSize: 'md',
};

export interface UserStats {
  cluesGiven: number;
  avgWordsPerClue: number;
  avgScoreOnClues: number;
  cluesSolved: number;
  avgWordsPicked: number;
  avgScore: number;
}
