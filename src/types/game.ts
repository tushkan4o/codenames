export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin';
export type BoardSize = '4x4' | '5x5';

export interface BoardConfig {
  size: BoardSize;
  cols: number;
  totalCards: number;
  redCount: number;
  blueCount: number;
  neutralCount: number;
  assassinCount: number;
}

export const BOARD_CONFIGS: Record<BoardSize, BoardConfig> = {
  '4x4': { size: '4x4', cols: 4, totalCards: 16, redCount: 6, blueCount: 5, neutralCount: 4, assassinCount: 1 },
  '5x5': { size: '5x5', cols: 5, totalCards: 25, redCount: 10, blueCount: 9, neutralCount: 5, assassinCount: 1 },
};

// Legacy config for clues created before this update (9/8/7/1 distribution)
export const BOARD_CONFIG_LEGACY_5x5: BoardConfig = {
  size: '5x5', cols: 5, totalCards: 25, redCount: 9, blueCount: 8, neutralCount: 7, assassinCount: 1,
};

export interface CardState {
  word: string;
  color: CardColor;
  revealed: boolean;
  position: number;
}

export interface BoardState {
  seed: string;
  cards: CardState[];
  startingTeam: 'red' | 'blue';
  config: BoardConfig;
}

export interface GameConfig {
  mode: GameMode;
  boardSize: BoardSize;
}

export interface Clue {
  id: string;
  word: string;
  number: number;
  boardSeed: string;
  targetIndices: number[];
  nullIndices: number[];
  createdAt: number;
  userId: string;
  userDisplayName?: string;
  words?: string[];
  colors?: string[];
  wordPack: string;
  boardSize: BoardSize;
  reshuffleCount: number;
  disabled?: boolean;
  ranked?: boolean;
  redCount?: number;
  blueCount?: number;
  assassinCount?: number;
}

export interface GuessResult {
  clueId: string;
  guessedIndices: number[];
  correctCount: number;
  totalTargets: number;
  score: number;
  timestamp: number;
  userId: string;
  boardSize?: BoardSize;
  disabled?: boolean;
  solveRating?: number;
}

export type GameMode = 'clue-giving' | 'guessing';
export type GamePhase = 'setup' | 'playing' | 'finished';

export interface GameState {
  mode: GameMode;
  board: BoardState | null;
  config: GameConfig;
  currentClue: Clue | null;
  guessedIndices: number[];
  selectedTargets: number[];
  phase: GamePhase;
  reshuffleCount: number;
}
