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

async function patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
  boardSeed: string;
  wordPack: string;
  createdAt: number;
  targetIndices: number[];
  nullIndices: number[];
  reportCount: number;
  disabled: boolean;
  ranked: boolean;
  attempts: number;
  avgScore: number;
}

export interface RatingStats {
  counts: Record<number, number>;
  total: number;
  avg: number;
}

export interface AdminUser {
  id: string;
  displayName: string;
  createdAt: number;
  isAdmin: boolean;
  cluesGiven: number;
  cluesSolved: number;
  avgScore: number;
  lastActivity: number;
  oauthProviders: string[];
  rankedCluesGiven: number;
  casualCluesGiven: number;
  rankedCluesSolved: number;
  casualCluesSolved: number;
}

export interface Report {
  id: number;
  clueId: string;
  userId: string;
  reason: string;
  createdAt: number;
}

export interface AdminResult {
  clueId: string;
  userId: string;
  score: number;
  correctCount: number;
  totalTargets: number;
  timestamp: number;
  boardSize: string;
  clueWord: string | null;
  clueNumber: number | null;
  ranked: boolean;
  guessedIndices: number[];
}

export const api = {
  async saveClue(clue: Clue): Promise<void> {
    await post('/api/game?route=clues', clue);
  },

  async getRandomClue(
    userId: string,
    excludeIds: string[] = [],
    wordPack?: string,
    boardSize?: BoardSize,
    ranked?: boolean,
  ): Promise<Clue | null> {
    const params = new URLSearchParams({ route: 'clues', action: 'random', userId });
    if (excludeIds.length > 0) params.set('exclude', excludeIds.join(','));
    if (wordPack) params.set('wordPack', wordPack);
    if (boardSize) params.set('boardSize', boardSize);
    if (ranked !== undefined) params.set('ranked', String(ranked));
    return get(`/api/game?${params}`);
  },

  async getClueById(id: string, reveal = false): Promise<Clue | null> {
    const params = new URLSearchParams({ route: 'clue', id });
    if (reveal) params.set('reveal', 'true');
    return get(`/api/game?${params}`);
  },

  async getCluesByUser(userId: string): Promise<Clue[]> {
    return get(`/api/game?route=clues&userId=${encodeURIComponent(userId)}`);
  },

  async saveGuessResult(result: Omit<GuessResult, 'correctCount' | 'totalTargets'>): Promise<{ targetIndices: number[]; nullIndices: number[] }> {
    return post('/api/game?route=results', result);
  },

  async getResultsByUser(userId: string): Promise<GuessResult[]> {
    return get(`/api/game?route=results&userId=${encodeURIComponent(userId)}`);
  },

  async getClueStats(clueId: string): Promise<{
    attempts: number;
    avgScore: number;
    scores: number[];
    pickCounts?: Record<number, number>;
    details?: { userId: string; score: number; timestamp: number; guessedIndices: number[] }[];
    createdAt?: number;
    ratingsCount?: number;
    avgRating?: number;
  }> {
    return get(`/api/game?route=clue&id=${encodeURIComponent(clueId)}&stats=true`);
  },

  async saveRating(clueId: string, userId: string, rating: number): Promise<void> {
    await post('/api/game?route=ratings', { clueId, userId, rating });
  },

  async getUserRating(clueId: string, userId: string): Promise<{ rating: number | null }> {
    return get(`/api/game?route=ratings&clueId=${encodeURIComponent(clueId)}&userId=${encodeURIComponent(userId)}`);
  },

  async getUserStats(userId: string): Promise<UserStats> {
    return get(`/api/game?route=stats&userId=${encodeURIComponent(userId)}`);
  },

  async getClueCount(userId: string, wordPack?: string, boardSize?: BoardSize, ranked?: boolean): Promise<{ available: number; total: number }> {
    const params = new URLSearchParams({ route: 'clues', action: 'random', userId, countOnly: 'true' });
    if (wordPack) params.set('wordPack', wordPack);
    if (boardSize) params.set('boardSize', boardSize);
    if (ranked !== undefined) params.set('ranked', String(ranked));
    return get(`/api/game?${params}`);
  },

  async getLeaderboard(boardSize?: BoardSize): Promise<{
    spymasters: { userId: string; cluesGiven: number; avgWordsPerClue: number; avgScoreOnClues: number }[];
    guessers: { userId: string; cluesSolved: number; avgWordsPicked: number; avgScore: number }[];
  }> {
    const params = new URLSearchParams({ route: 'leaderboard' });
    if (boardSize) params.set('boardSize', boardSize);
    return get(`/api/game?${params}`);
  },

  async toggleClueDisabled(clueId: string, userId: string, disabled: boolean): Promise<void> {
    await patch(`/api/game?route=clue&id=${encodeURIComponent(clueId)}`, { userId, disabled });
  },

  // Reports
  async submitReport(clueId: string, userId: string, reason: string): Promise<void> {
    await post('/api/game?route=ratings', { clueId, userId, reason });
  },

  // Admin operations
  async adminGetAllClues(adminId: string): Promise<AdminClue[]> {
    return get(`/api/admin?action=clues&adminId=${encodeURIComponent(adminId)}`);
  },

  async adminGetReports(adminId: string, clueId: string): Promise<Report[]> {
    return get(`/api/admin?action=reports&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}`);
  },

  async adminGetRatings(adminId: string, clueId: string): Promise<RatingStats> {
    return get(`/api/admin?action=ratings&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}`);
  },

  async adminGetUsers(adminId: string): Promise<AdminUser[]> {
    return get(`/api/admin?action=users&adminId=${encodeURIComponent(adminId)}`);
  },

  async adminDeleteClue(adminId: string, clueId: string): Promise<void> {
    await del(`/api/admin?action=deleteClue&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}`);
  },

  async adminDeleteUser(adminId: string, userId: string): Promise<void> {
    await del(`/api/admin?action=deleteUser&adminId=${encodeURIComponent(adminId)}&userId=${encodeURIComponent(userId)}`);
  },

  async adminGetAllResults(adminId: string): Promise<AdminResult[]> {
    return get(`/api/admin?action=results&adminId=${encodeURIComponent(adminId)}`);
  },

  async adminDeleteResult(adminId: string, clueId: string, userId: string, timestamp: number): Promise<void> {
    await del(`/api/admin?action=deleteResult&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}&userId=${encodeURIComponent(userId)}&timestamp=${timestamp}`);
  },

  async adminUpdateClue(adminId: string, clueId: string, updates: { targetIndices?: number[]; number?: number; nullIndices?: number[] }): Promise<void> {
    await patch(`/api/admin?action=updateClue&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}`, updates);
  },

  // OAuth
  async getOAuthUrl(provider: string, linkUserId?: string): Promise<{ url: string }> {
    const params = new URLSearchParams({ action: 'url', provider });
    if (linkUserId) params.set('linkUserId', linkUserId);
    return get(`/api/auth/oauth?${params}`);
  },

  async resolveOAuthToken(token: string): Promise<Record<string, unknown>> {
    return post('/api/auth/oauth?action=resolve', { token });
  },

  async completeOAuthRegistration(token: string, displayName: string): Promise<Record<string, unknown>> {
    return post('/api/auth/oauth?action=complete', { token, displayName });
  },

  async getOAuthAccounts(userId: string): Promise<{ provider: string; providerName: string; email: string | null; linkedAt: number }[]> {
    return get(`/api/auth/oauth?action=accounts&userId=${encodeURIComponent(userId)}`);
  },

  async unlinkOAuth(userId: string, provider: string): Promise<void> {
    await post('/api/auth/oauth?action=unlink', { userId, provider });
  },

  async renameUser(userId: string, newDisplayName: string): Promise<{ ok: boolean; displayName: string }> {
    return post('/api/auth/oauth?action=rename', { userId, newDisplayName });
  },
};
