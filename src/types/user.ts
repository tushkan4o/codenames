import type { BoardSize, Language, WordPack } from './game';

export interface User {
  id: string;
  displayName: string;
  createdAt: number;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: Language;
  defaultWordPack: WordPack;
  defaultBoardSize: BoardSize;
  animationEnabled: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  defaultWordPack: 'ru',
  defaultBoardSize: '5x5',
  animationEnabled: true,
};

export interface UserStats {
  cluesGiven: number;
  avgWordsPerClue: number;
  avgScoreOnClues: number;
  cluesSolved: number;
  avgWordsPicked: number;
  avgScore: number;
}
