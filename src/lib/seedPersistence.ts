import type { BoardSize, WordPack } from '../types/game';

interface PendingClueState {
  seed: string;
  wordPack: WordPack;
  boardSize: BoardSize;
}

interface PendingGuessState {
  clueId: string;
  guessedIndices: number[];
}

const PENDING_CLUE_KEY = 'codenames_pending_clue';
const PENDING_GUESS_KEY = 'codenames_pending_guess';

export function savePendingClue(data: PendingClueState): void {
  localStorage.setItem(PENDING_CLUE_KEY, JSON.stringify(data));
}

export function getPendingClue(): PendingClueState | null {
  const raw = localStorage.getItem(PENDING_CLUE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearPendingClue(): void {
  localStorage.removeItem(PENDING_CLUE_KEY);
}

export function savePendingGuess(data: PendingGuessState): void {
  localStorage.setItem(PENDING_GUESS_KEY, JSON.stringify(data));
}

export function getPendingGuess(): PendingGuessState | null {
  const raw = localStorage.getItem(PENDING_GUESS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearPendingGuess(): void {
  localStorage.removeItem(PENDING_GUESS_KEY);
}
