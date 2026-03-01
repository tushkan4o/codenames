import type { BoardSize, Clue, GuessResult } from '../types/game';
import type { UserStats } from '../types/user';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function del(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

export interface AdminClue {
  id: string;
  word: string;
  number: number;
  userId: string;
  boardSize: string;
  createdAt: number;
  targetIndices: number[];
  nullIndices: number[];
  reportCount: number;
}

export interface Report {
  id: number;
  clueId: string;
  userId: string;
  reason: string;
  createdAt: number;
}

export const api = {
  async saveClue(clue: Clue): Promise<void> {
    await post('/api/clues', clue);
  },

  async getRandomClue(
    userId: string,
    excludeIds: string[] = [],
    wordPack?: string,
    boardSize?: BoardSize,
  ): Promise<Clue | null> {
    const params = new URLSearchParams({ userId });
    if (excludeIds.length > 0) params.set('exclude', excludeIds.join(','));
    if (wordPack) params.set('wordPack', wordPack);
    if (boardSize) params.set('boardSize', boardSize);
    return get(`/api/clues/random?${params}`);
  },

  async getClueById(id: string, reveal = false): Promise<Clue | null> {
    const params = reveal ? '?reveal=true' : '';
    return get(`/api/clues/${encodeURIComponent(id)}${params}`);
  },

  async getCluesByUser(userId: string): Promise<Clue[]> {
    return get(`/api/clues?userId=${encodeURIComponent(userId)}`);
  },

  async saveGuessResult(result: Omit<GuessResult, 'correctCount' | 'totalTargets'>): Promise<{ targetIndices: number[]; nullIndices: number[] }> {
    return post('/api/results', result);
  },

  async getResultsByUser(userId: string): Promise<GuessResult[]> {
    return get(`/api/results?userId=${encodeURIComponent(userId)}`);
  },

  async getClueStats(clueId: string): Promise<{ attempts: number; avgScore: number; scores: number[] }> {
    return get(`/api/clues/${encodeURIComponent(clueId)}?stats=true`);
  },

  async saveRating(clueId: string, userId: string, rating: number): Promise<void> {
    await post('/api/ratings', { clueId, userId, rating });
  },

  async getUserStats(userId: string): Promise<UserStats> {
    return get(`/api/users/${encodeURIComponent(userId)}/stats`);
  },

  async getClueCount(userId: string, wordPack?: string, boardSize?: BoardSize): Promise<{ available: number; total: number }> {
    const params = new URLSearchParams({ userId, countOnly: 'true' });
    if (wordPack) params.set('wordPack', wordPack);
    if (boardSize) params.set('boardSize', boardSize);
    return get(`/api/clues/random?${params}`);
  },

  async getLeaderboard(boardSize?: BoardSize): Promise<{
    spymasters: { userId: string; cluesGiven: number; avgWordsPerClue: number; avgScoreOnClues: number }[];
    guessers: { userId: string; cluesSolved: number; avgWordsPicked: number; avgScore: number }[];
  }> {
    const params = boardSize ? `?boardSize=${boardSize}` : '';
    return get(`/api/leaderboard${params}`);
  },

  // Reports
  async submitReport(clueId: string, userId: string, reason: string): Promise<void> {
    await post('/api/ratings', { clueId, userId, reason });
  },

  // Admin operations
  async adminGetAllClues(adminId: string): Promise<AdminClue[]> {
    return get(`/api/admin?action=clues&adminId=${encodeURIComponent(adminId)}`);
  },

  async adminGetReports(adminId: string, clueId: string): Promise<Report[]> {
    return get(`/api/admin?action=reports&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}`);
  },

  async adminDeleteClue(adminId: string, clueId: string): Promise<void> {
    await del(`/api/admin?action=deleteClue&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}`);
  },

  async adminDeleteUser(adminId: string, userId: string): Promise<void> {
    await del(`/api/admin?action=deleteUser&adminId=${encodeURIComponent(adminId)}&userId=${encodeURIComponent(userId)}`);
  },
};
