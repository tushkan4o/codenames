import type { neon } from '@neondatabase/serverless';

// ==================== RATING FORMULAS ====================

export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Clue rating = P75(scores)*20 + avg(scores)*20 - reshuffles*10, rounded to integer */
export function computeClueRating(scores: number[], reshuffleCount: number = 0): number {
  if (scores.length === 0) return 0;
  const p75 = percentile(scores, 75);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  return Math.round(p75 * 20 + avg * 20 - reshuffleCount * 10);
}

/** Captain rating = avg(clue ratings of ranked clues), rounded to integer */
export function computeCaptainRating(clueRatings: number[]): number {
  if (clueRatings.length === 0) return 0;
  const avg = clueRatings.reduce((s, v) => s + v, 0) / clueRatings.length;
  return Math.round(avg);
}

/** Solve rating for a single solve = 120 + score*40 - clueRating */
export function computeSolveRating(score: number, clueRating: number): number {
  return Math.round(120 + score * 40 - clueRating);
}

/** Scout rating = avg(solveRatings), rounded to integer */
export function computeScoutRating(solveRatings: number[]): number {
  if (solveRatings.length === 0) return 0;
  return Math.round(solveRatings.reduce((s, v) => s + v, 0) / solveRatings.length);
}

/** Overall = captain*0.5 + scout*0.5, or solo rating if only one role */
export function computeOverallRating(captainRating: number, scoutRating: number, hasCaptain: boolean, hasScout: boolean): number {
  if (hasCaptain && hasScout) return Math.round(captainRating * 0.5 + scoutRating * 0.5);
  if (hasCaptain) return captainRating;
  return scoutRating;
}

// ==================== PRECOMPUTED RATING HELPERS ====================

/** Recompute and store all stats for a single clue */
export async function recalcClueStats(sql: ReturnType<typeof neon>, clueId: string): Promise<void> {
  // Run all 3 reads in parallel
  const [resultRows, clueRow, ratingRows] = await Promise.all([
    sql`SELECT score FROM results WHERE clue_id = ${clueId} AND (disabled IS NOT TRUE)`,
    sql`SELECT reshuffle_count FROM clues WHERE id = ${clueId}`,
    sql`SELECT rating FROM ratings WHERE clue_id = ${clueId}`,
  ]) as [Record<string, unknown>[], Record<string, unknown>[], Record<string, unknown>[]];
  const scores = resultRows.map((r) => Number(r.score) || 0);
  const reshuffleCount = clueRow.length > 0 ? Number(clueRow[0].reshuffle_count) || 0 : 0;
  const clueRating = computeClueRating(scores, reshuffleCount);
  const attempts = resultRows.length;
  const avgScore = attempts > 0 ? scores.reduce((s, v) => s + v, 0) / attempts : 0;
  const ratingsCount = ratingRows.length;
  const avgRating = ratingsCount > 0
    ? ratingRows.reduce((s: number, r) => s + (Number(r.rating) || 0), 0) / ratingsCount : 0;
  await sql`UPDATE clues SET
    clue_rating = ${clueRating}, attempts = ${attempts},
    avg_score = ${Math.round(avgScore * 10) / 10},
    ratings_count = ${ratingsCount},
    avg_rating = ${Math.round(avgRating * 10) / 10}
    WHERE id = ${clueId}`;
  // Recompute solve_rating for all results of this clue (120 + score*40 - clueRating)
  await sql`UPDATE results SET solve_rating = (120 + COALESCE(score, 0) * 40 - ${clueRating})::int WHERE clue_id = ${clueId}`;
}

/** Recompute and store all stats + ratings for a single user */
export async function recalcUserStats(sql: ReturnType<typeof neon>, userId: string): Promise<void> {
  // Fetch clue and solve data in parallel (independent queries)
  const [clueRows, solveRows] = await Promise.all([
    sql`SELECT id, number, ranked FROM clues WHERE user_id = ${userId}`,
    sql`SELECT score, guessed_indices, clue_id FROM results WHERE user_id = ${userId} AND (disabled IS NOT TRUE)`,
  ]) as [Record<string, unknown>[], Record<string, unknown>[]];

  const cluesGiven = clueRows.length;
  const avgWordsPerClue = cluesGiven > 0
    ? clueRows.reduce((s: number, c: Record<string, unknown>) => s + (Number(c.number) || 0), 0) / cluesGiven : 0;

  // Avg score others got on this user's clues
  let avgScoreOnClues = 0;
  if (cluesGiven > 0) {
    const clueIds = clueRows.map((c: Record<string, unknown>) => c.id as string);
    const othersRows = await sql`SELECT COALESCE(AVG(score), 0) as avg FROM results WHERE clue_id = ANY(${clueIds}) AND user_id != ${userId} AND (disabled IS NOT TRUE)`;
    avgScoreOnClues = Number(othersRows[0].avg) || 0;
  }
  const cluesSolved = solveRows.length;
  const avgWordsPicked = cluesSolved > 0
    ? solveRows.reduce((s: number, r: Record<string, unknown>) => s + ((r.guessed_indices as number[])?.length || 0), 0) / cluesSolved : 0;
  const avgScore = cluesSolved > 0
    ? solveRows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.score) || 0), 0) / cluesSolved : 0;

  // Captain rating: based on user's ranked clues
  const rankedClueIds = clueRows
    .filter((c: Record<string, unknown>) => c.ranked !== false)
    .map((c: Record<string, unknown>) => c.id as string);
  const rankedCluesGiven = rankedClueIds.length;
  let captainRating = 0;
  if (rankedCluesGiven > 0) {
    const ratedClues = await sql`SELECT id, clue_rating FROM clues WHERE id = ANY(${rankedClueIds}) AND clue_rating > 0`;
    const clueRatings = ratedClues.map((c: Record<string, unknown>) => Number(c.clue_rating) || 0);
    captainRating = computeCaptainRating(clueRatings);
  }

  // Scout rating: based on user's solves of ranked clues by OTHER users
  let scoutRating = 0;
  let rankedCluesSolved = 0;
  if (cluesSolved > 0) {
    const solvedClueIds = [...new Set(solveRows.map((r: Record<string, unknown>) => r.clue_id as string))];
    const solvedClueRows = await sql`SELECT id, clue_rating, ranked, user_id FROM clues WHERE id = ANY(${solvedClueIds})`;
    const rankedOtherClueMap = new Map<string, number>();
    for (const c of solvedClueRows) {
      if (c.ranked !== false && (c.user_id as string) !== userId) {
        rankedOtherClueMap.set(c.id as string, Number(c.clue_rating) || 0);
      }
    }
    const rankedOtherSolves = solveRows.filter((r: Record<string, unknown>) => rankedOtherClueMap.has(r.clue_id as string));
    rankedCluesSolved = rankedOtherSolves.length;
    if (rankedCluesSolved > 0) {
      const solveRatings = rankedOtherSolves.map((r: Record<string, unknown>) =>
        computeSolveRating(Number(r.score) || 0, rankedOtherClueMap.get(r.clue_id as string) || 0)
      );
      scoutRating = computeScoutRating(solveRatings);
    }
  }

  const overallRating = computeOverallRating(captainRating, scoutRating, captainRating > 0, scoutRating > 0);

  await sql`UPDATE users SET
    captain_rating = ${captainRating}, scout_rating = ${scoutRating},
    overall_rating = ${overallRating}, ranked_clues_given = ${rankedCluesGiven},
    ranked_clues_solved = ${rankedCluesSolved},
    clues_given = ${cluesGiven},
    avg_words_per_clue = ${Math.round(avgWordsPerClue * 10) / 10},
    avg_score_on_clues = ${Math.round(avgScoreOnClues * 10) / 10},
    clues_solved = ${cluesSolved},
    avg_words_picked = ${Math.round(avgWordsPicked * 10) / 10},
    avg_score = ${Math.round(avgScore * 10) / 10}
    WHERE id = ${userId}`;
}
