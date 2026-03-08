import type { BoardSize } from './game';

export interface User {
  id: string;
  displayName: string;
  createdAt: number;
  preferences: UserPreferences;
  isAdmin: boolean;
  hasOAuth: boolean;
  casualCluesGiven: number;
  casualCluesSolved: number;
  sessionVersion: number;
}

export type CardFontSize = 'sm' | 'md' | 'lg';
export type ColorSortMode = 'rows' | 'columns';

export interface UserPreferences {
  defaultBoardSize: BoardSize;
  animationEnabled: boolean;
  revealDuration: number;
  submitDelay: number;
  cardFontSize: CardFontSize;
  colorSortMode: ColorSortMode;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultBoardSize: '5x5',
  animationEnabled: true,
  revealDuration: 1000,
  submitDelay: 2000,
  cardFontSize: 'md',
  colorSortMode: 'rows',
};

export interface UserStats {
  displayName: string;
  cluesGiven: number;
  avgWordsPerClue: number;
  avgScoreOnClues: number;
  cluesSolved: number;
  avgWordsPicked: number;
  avgScore: number;
  avatarUrl?: string;
  bio?: string;
  country?: string;
}

export interface NameHistoryEntry {
  oldName: string;
  changedAt: number;
}
