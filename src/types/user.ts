import type { BoardSize } from './game';

export interface User {
  id: string;
  displayName: string;
  createdAt: number;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultBoardSize: BoardSize;
  animationEnabled: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
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
