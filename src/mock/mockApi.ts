import type { BoardSize, Clue, GuessResult, WordPack } from '../types/game';
import type { UserStats } from '../types/user';

const CLUES_KEY = 'codenames_clues';
const RESULTS_KEY = 'codenames_results';
const RATINGS_KEY = 'codenames_ratings';

interface Rating {
  clueId: string;
  userId: string;
  rating: number;
}

function getStored<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function setStored<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const mockApi = {
  // --- Clues ---
  async saveClue(clue: Clue): Promise<void> {
    const clues = getStored<Clue>(CLUES_KEY);
    clues.push(clue);
    setStored(CLUES_KEY, clues);
  },

  async getRandomClue(
    userId: string,
    excludeIds: string[] = [],
    wordPack?: WordPack,
    boardSize?: BoardSize,
  ): Promise<Clue | null> {
    let clues = getStored<Clue>(CLUES_KEY)
      .filter((c) => !excludeIds.includes(c.id))
      .filter((c) => c.userId !== userId); // don't guess your own clues
    if (wordPack) clues = clues.filter((c) => c.wordPack === wordPack);
    if (boardSize) clues = clues.filter((c) => c.boardSize === boardSize);
    if (clues.length === 0) return null;
    return clues[Math.floor(Math.random() * clues.length)];
  },

  async getClueById(id: string): Promise<Clue | null> {
    const clues = getStored<Clue>(CLUES_KEY);
    return clues.find((c) => c.id === id) ?? null;
  },

  async getCluesByUser(userId: string): Promise<Clue[]> {
    return getStored<Clue>(CLUES_KEY).filter((c) => c.userId === userId);
  },

  async getAllClues(): Promise<Clue[]> {
    return getStored<Clue>(CLUES_KEY);
  },

  // --- Guess Results ---
  async saveGuessResult(result: GuessResult): Promise<void> {
    const results = getStored<GuessResult>(RESULTS_KEY);
    results.push(result);
    setStored(RESULTS_KEY, results);
  },

  async getResultsByUser(userId: string): Promise<GuessResult[]> {
    return getStored<GuessResult>(RESULTS_KEY).filter((r) => r.userId === userId);
  },

  async getResultsForClue(clueId: string): Promise<GuessResult[]> {
    return getStored<GuessResult>(RESULTS_KEY).filter((r) => r.clueId === clueId);
  },

  async getClueStats(clueId: string): Promise<{ attempts: number; avgScore: number }> {
    const results = getStored<GuessResult>(RESULTS_KEY).filter((r) => r.clueId === clueId);
    if (results.length === 0) return { attempts: 0, avgScore: 0 };
    const totalScore = results.reduce((sum, r) => sum + (r.score ?? 0), 0);
    return {
      attempts: results.length,
      avgScore: totalScore / results.length,
    };
  },

  // --- Ratings ---
  async saveRating(clueId: string, userId: string, rating: number): Promise<void> {
    const ratings = getStored<Rating>(RATINGS_KEY);
    const existing = ratings.findIndex((r) => r.clueId === clueId && r.userId === userId);
    if (existing >= 0) {
      ratings[existing].rating = rating;
    } else {
      ratings.push({ clueId, userId, rating });
    }
    setStored(RATINGS_KEY, ratings);
  },

  // --- User Stats ---
  async getUserStats(userId: string): Promise<UserStats> {
    const clues = getStored<Clue>(CLUES_KEY).filter((c) => c.userId === userId);
    const results = getStored<GuessResult>(RESULTS_KEY);
    const myResults = results.filter((r) => r.userId === userId);

    // Avg words per clue (clue.number)
    const avgWordsPerClue = clues.length > 0
      ? clues.reduce((s, c) => s + c.number, 0) / clues.length
      : 0;

    // Avg score on my clues (how others did)
    const clueIds = new Set(clues.map((c) => c.id));
    const othersOnMyClues = results.filter((r) => clueIds.has(r.clueId) && r.userId !== userId);
    const avgScoreOnClues = othersOnMyClues.length > 0
      ? othersOnMyClues.reduce((s, r) => s + (r.score ?? 0), 0) / othersOnMyClues.length
      : 0;

    // Avg words picked when guessing
    const avgWordsPicked = myResults.length > 0
      ? myResults.reduce((s, r) => s + r.guessedIndices.length, 0) / myResults.length
      : 0;

    // Avg guessing score
    const avgScore = myResults.length > 0
      ? myResults.reduce((s, r) => s + (r.score ?? 0), 0) / myResults.length
      : 0;

    return {
      cluesGiven: clues.length,
      avgWordsPerClue: Math.round(avgWordsPerClue * 10) / 10,
      avgScoreOnClues: Math.round(avgScoreOnClues * 10) / 10,
      cluesSolved: myResults.length,
      avgWordsPicked: Math.round(avgWordsPicked * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
    };
  },

  // --- Data Cleanup ---
  async clearAllData(): Promise<void> {
    localStorage.removeItem(CLUES_KEY);
    localStorage.removeItem(RESULTS_KEY);
    localStorage.removeItem(RATINGS_KEY);
  },

  // --- Leaderboard ---
  async getLeaderboard(): Promise<{
    spymasters: { userId: string; cluesGiven: number; avgWordsPerClue: number; avgScoreOnClues: number }[];
    guessers: { userId: string; cluesSolved: number; avgWordsPicked: number; avgScore: number }[];
  }> {
    const clues = getStored<Clue>(CLUES_KEY);
    const results = getStored<GuessResult>(RESULTS_KEY);

    // Group clues by user
    const cluesByUser = new Map<string, Clue[]>();
    for (const c of clues) {
      if (!cluesByUser.has(c.userId)) cluesByUser.set(c.userId, []);
      cluesByUser.get(c.userId)!.push(c);
    }

    // Group results by user
    const resultsByUser = new Map<string, GuessResult[]>();
    for (const r of results) {
      if (!resultsByUser.has(r.userId)) resultsByUser.set(r.userId, []);
      resultsByUser.get(r.userId)!.push(r);
    }

    // Spymasters leaderboard
    const spymasters = Array.from(cluesByUser.entries()).map(([userId, userClues]) => {
      const avgWordsPerClue = userClues.reduce((s, c) => s + c.number, 0) / userClues.length;
      const clueIds = new Set(userClues.map((c) => c.id));
      const othersResults = results.filter((r) => clueIds.has(r.clueId) && r.userId !== userId);
      const avgScoreOnClues = othersResults.length > 0
        ? othersResults.reduce((s, r) => s + (r.score ?? 0), 0) / othersResults.length
        : 0;
      return {
        userId,
        cluesGiven: userClues.length,
        avgWordsPerClue: Math.round(avgWordsPerClue * 10) / 10,
        avgScoreOnClues: Math.round(avgScoreOnClues * 10) / 10,
      };
    }).sort((a, b) => b.avgScoreOnClues - a.avgScoreOnClues);

    // Guessers leaderboard
    const guessers = Array.from(resultsByUser.entries()).map(([userId, userResults]) => {
      const avgWordsPicked = userResults.reduce((s, r) => s + r.guessedIndices.length, 0) / userResults.length;
      const avgScore = userResults.reduce((s, r) => s + (r.score ?? 0), 0) / userResults.length;
      return {
        userId,
        cluesSolved: userResults.length,
        avgWordsPicked: Math.round(avgWordsPicked * 10) / 10,
        avgScore: Math.round(avgScore * 10) / 10,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    return { spymasters, guessers };
  },
};
