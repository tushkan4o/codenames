import type { BoardSize, Clue, GuessResult, WordPack } from '../types/game';
import type { UserStats } from '../types/user';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json();
}

export const api = {
  // --- Clues ---
  async saveClue(clue: Clue): Promise<void> {
    await post('/api/clues', clue);
  },

  async getRandomClue(
    userId: string,
    excludeIds: string[] = [],
    wordPack?: WordPack,
    boardSize?: BoardSize,
  ): Promise<Clue | null> {
    const params = new URLSearchParams({ userId });
    if (excludeIds.length > 0) params.set('exclude', excludeIds.join(','));
    if (wordPack) params.set('wordPack', wordPack);
    if (boardSize) params.set('boardSize', boardSize);
    return get(`/api/clues/random?${params}`);
  },

  async getClueById(id: string): Promise<Clue | null> {
    return get(`/api/clues/${encodeURIComponent(id)}`);
  },

  async getCluesByUser(userId: string): Promise<Clue[]> {
    return get(`/api/clues?userId=${encodeURIComponent(userId)}`);
  },

  // --- Guess Results ---
  async saveGuessResult(result: GuessResult): Promise<void> {
    await post('/api/results', result);
  },

  async getResultsByUser(userId: string): Promise<GuessResult[]> {
    return get(`/api/results?userId=${encodeURIComponent(userId)}`);
  },

  async getClueStats(clueId: string): Promise<{ attempts: number; avgScore: number; scores: number[] }> {
    return get(`/api/clues/${encodeURIComponent(clueId)}?stats=true`);
  },

  // --- Ratings ---
  async saveRating(clueId: string, userId: string, rating: number): Promise<void> {
    await post('/api/ratings', { clueId, userId, rating });
  },

  // --- User Stats ---
  async getUserStats(userId: string): Promise<UserStats> {
    return get(`/api/users/${encodeURIComponent(userId)}/stats`);
  },

  // --- Clue Count ---
  async getClueCount(userId: string, wordPack?: WordPack, boardSize?: BoardSize): Promise<{ available: number; total: number }> {
    const params = new URLSearchParams({ userId, countOnly: 'true' });
    if (wordPack) params.set('wordPack', wordPack);
    if (boardSize) params.set('boardSize', boardSize);
    return get(`/api/clues/random?${params}`);
  },

  // --- Leaderboard ---
  async getLeaderboard(boardSize?: BoardSize): Promise<{
    spymasters: { userId: string; cluesGiven: number; avgWordsPerClue: number; avgScoreOnClues: number }[];
    guessers: { userId: string; cluesSolved: number; avgWordsPicked: number; avgScore: number }[];
  }> {
    const params = boardSize ? `?boardSize=${boardSize}` : '';
    return get(`/api/leaderboard${params}`);
  },
};
