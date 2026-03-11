import type { BoardSize, Clue, GuessResult } from '../types/game';
import type { UserStats, NameHistoryEntry } from '../types/user';

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
  displayName: string;
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
  redCount: number | null;
  blueCount: number | null;
  assassinCount: number | null;
}

export interface RatingStats {
  counts: Record<number, number>;
  total: number;
  avg: number;
  items?: { userId: string; displayName: string; rating: number }[];
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

export interface AdminFeedback {
  id: number;
  userId: string;
  displayName: string;
  message: string;
  screenshots: string[];
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
  disabled: boolean;
  guessedIndices: number[];
}

export const api = {
  async saveClue(clue: Clue): Promise<void> {
    await post('/api/game?route=clues', clue);
  },

  async startCaptainGame(userId: string, ranked: boolean, params: string): Promise<{ seed: string; params: string; reshuffleCount: number; ranked: boolean }> {
    return post('/api/game?route=captain-game', { userId, ranked, params });
  },

  async getActiveCaptainGame(userId: string): Promise<{ seed: string; params: string; reshuffleCount: number; ranked: boolean }> {
    return post('/api/game?route=captain-game', { userId });
  },

  async captainReshuffle(userId: string): Promise<{ seed: string; params: string; reshuffleCount: number; ranked: boolean }> {
    return post('/api/game?route=captain-reshuffle', { userId });
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

  async getClueById(id: string, reveal = false, userId?: string): Promise<(Clue & { existingResult?: { guessedIndices: number[]; score: number; correctCount: number; totalTargets: number } }) | null> {
    const params = new URLSearchParams({ route: 'clue', id });
    if (reveal) params.set('reveal', 'true');
    if (userId) params.set('userId', userId);
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
    clueRating?: number;
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
    spymasters: { userId: string; displayName: string; cluesGiven: number; avgWordsPerClue: number; avgScoreOnClues: number; captainRating: number }[];
    guessers: { userId: string; displayName: string; cluesSolved: number; avgWordsPicked: number; avgScore: number; scoutRating: number }[];
  }> {
    const params = new URLSearchParams({ route: 'leaderboard' });
    if (boardSize) params.set('boardSize', boardSize);
    return get(`/api/game?${params}`);
  },

  async toggleClueDisabled(clueId: string, userId: string, disabled: boolean): Promise<void> {
    await patch(`/api/game?route=clue&id=${encodeURIComponent(clueId)}`, { userId, disabled });
  },

  async toggleResultDisabled(clueId: string, resultUserId: string, timestamp: number, disabled: boolean, adminUserId: string): Promise<void> {
    await patch('/api/game?route=results', { clueId, resultUserId, timestamp, disabled, adminUserId });
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

  async adminGetResults(adminId: string, opts?: { limit?: number; cursor?: string; search?: string; sortField?: string; sortDir?: string; offset?: number }): Promise<{ items: AdminResult[]; hasMore: boolean; nextCursor: string | null; total?: number }> {
    const params = new URLSearchParams({ action: 'results', adminId });
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.cursor) params.set('cursor', opts.cursor);
    if (opts?.search) params.set('search', opts.search);
    if (opts?.sortField) params.set('sortField', opts.sortField);
    if (opts?.sortDir) params.set('sortDir', opts.sortDir);
    if (opts?.offset) params.set('offset', String(opts.offset));
    return get(`/api/admin?${params}`);
  },

  async adminDeleteResult(adminId: string, clueId: string, userId: string, timestamp: number): Promise<void> {
    await del(`/api/admin?action=deleteResult&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}&userId=${encodeURIComponent(userId)}&timestamp=${timestamp}`);
  },

  async adminUpdateClue(adminId: string, clueId: string, updates: { targetIndices?: number[]; number?: number; nullIndices?: number[] }): Promise<void> {
    await patch(`/api/admin?action=updateClue&adminId=${encodeURIComponent(adminId)}&clueId=${encodeURIComponent(clueId)}`, updates);
  },

  async adminRenameUser(adminId: string, userId: string, newDisplayName: string): Promise<{ ok: boolean; displayName: string }> {
    return patch(`/api/admin?action=renameUser&adminId=${encodeURIComponent(adminId)}&userId=${encodeURIComponent(userId)}`, { newDisplayName });
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

  // Notifications
  async getNotifications(userId: string): Promise<{ id: number; type: string; actorId: string; actorName: string; clueId: string; clueWord: string; scoreInfo: { score: number; correctCount: number; totalTargets: number } | null; createdAt: number; read: boolean }[]> {
    return get(`/api/game?route=notifications&userId=${encodeURIComponent(userId)}`);
  },

  async getAllNotifications(userId: string, opts?: { offset?: number; limit?: number; typeFilter?: string; actorFilter?: string }): Promise<{ notifications: { id: number; type: string; actorId: string; actorName: string; clueId: string; clueWord: string; scoreInfo: { score: number; correctCount: number; totalTargets: number } | null; createdAt: number; read: boolean }[]; total: number }> {
    const params = new URLSearchParams({ route: 'notifications', userId, all: 'true' });
    if (opts?.offset) params.set('offset', String(opts.offset));
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.typeFilter) params.set('typeFilter', opts.typeFilter);
    if (opts?.actorFilter) params.set('actorFilter', opts.actorFilter);
    return get(`/api/game?${params}`);
  },

  async markNotificationsRead(userId: string): Promise<void> {
    await post('/api/game?route=notifications', { userId, action: 'read_all' });
  },

  async clearNotifications(userId: string): Promise<void> {
    await post('/api/game?route=notifications', { userId, action: 'clear_all' });
  },

  async deleteNotifications(userId: string, ids: number[]): Promise<void> {
    await post('/api/game?route=notifications', { userId, action: 'delete_selected', ids });
  },

  // Subscriptions
  async checkSubscription(userId: string, targetId: string): Promise<{ subscribed: boolean }> {
    return get(`/api/game?route=subscriptions&userId=${encodeURIComponent(userId)}&targetId=${encodeURIComponent(targetId)}`);
  },

  async subscribe(subscriberId: string, targetId: string): Promise<void> {
    await post('/api/game?route=subscriptions', { subscriberId, targetId });
  },

  async unsubscribe(subscriberId: string, targetId: string): Promise<void> {
    await del(`/api/game?route=subscriptions&subscriberId=${encodeURIComponent(subscriberId)}&targetId=${encodeURIComponent(targetId)}`);
  },

  // Player search (for mentions)
  async searchPlayers(query: string): Promise<{ id: string; displayName: string }[]> {
    return get(`/api/game?route=stats&search=${encodeURIComponent(query)}`);
  },

  // Profile comments (wall)
  async getProfileComments(profileUserId: string): Promise<{ commentsDisabled: boolean; comments: { id: number; authorId: string; displayName: string; content: string; createdAt: number; replyToId: number | null; replyToDisplayName: string | null; replyToContent: string | null }[] }> {
    return get(`/api/game?route=profile-comments&profileUserId=${encodeURIComponent(profileUserId)}`);
  },

  async addProfileComment(profileUserId: string, authorId: string, content: string, replyToId?: number): Promise<{ ok: boolean; id: number }> {
    return post('/api/game?route=profile-comments', { profileUserId, authorId, content, replyToId: replyToId || null });
  },

  async deleteProfileComment(id: number, userId: string): Promise<void> {
    await del(`/api/game?route=profile-comments&id=${id}&userId=${encodeURIComponent(userId)}`);
  },

  async toggleProfileComments(userId: string, disabled: boolean): Promise<void> {
    await post('/api/game?route=profile-comments', { action: 'toggle_comments', userId, disabled });
  },

  // Comments
  async getCommentsByUser(userId: string): Promise<{ id: number; clueId: string; clueWord: string; content: string; createdAt: number }[]> {
    return get(`/api/game?route=comments&userId=${encodeURIComponent(userId)}`);
  },

  async getComments(clueId: string): Promise<{ id: number; userId: string; displayName: string; content: string; createdAt: number; replyToId: number | null; replyToDisplayName: string | null; replyToContent: string | null }[]> {
    return get(`/api/game?route=comments&clueId=${encodeURIComponent(clueId)}`);
  },

  async addComment(clueId: string, userId: string, content: string, replyToId?: number): Promise<{ ok: boolean; id: number }> {
    return post('/api/game?route=comments', { clueId, userId, content, replyToId: replyToId || null });
  },

  async deleteComment(id: number, userId: string, isAdmin?: boolean): Promise<void> {
    if (isAdmin) {
      await del(`/api/game?route=comments&id=${id}&adminId=${encodeURIComponent(userId)}`);
    } else {
      await del(`/api/game?route=comments&id=${id}&userId=${encodeURIComponent(userId)}`);
    }
  },

  // Profile
  async uploadAvatar(userId: string, file: File): Promise<{ avatarUrl: string }> {
    const res = await fetch(`/api/auth/avatar?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async updateProfile(userId: string, data: { bio?: string; country?: string }): Promise<void> {
    await patch('/api/game?route=profile', { userId, ...data });
  },

  async getNameHistory(userId: string): Promise<NameHistoryEntry[]> {
    return get(`/api/game?route=nameHistory&userId=${encodeURIComponent(userId)}`);
  },

  // Feedback
  async uploadFeedbackScreenshot(userId: string, file: File): Promise<{ url: string }> {
    const res = await fetch(`/api/feedback?action=upload&userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async submitFeedback(userId: string, message: string, screenshots: string[]): Promise<void> {
    await post('/api/feedback?action=submit', { userId, message, screenshots });
  },

  async adminGetFeedback(adminId: string): Promise<AdminFeedback[]> {
    return get(`/api/feedback?action=list&adminId=${encodeURIComponent(adminId)}`);
  },

  async recalcAll(): Promise<{ ok: boolean }> {
    return post('/api/game?route=recalc-all', {});
  },
};
