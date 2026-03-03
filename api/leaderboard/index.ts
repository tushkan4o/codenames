import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { boardSize } = req.query;
  const sql = neon(process.env.DATABASE_URL!);

  // Fetch clues and results, optionally filtered by board size
  let clues: Record<string, unknown>[];
  let results: Record<string, unknown>[];

  if (boardSize && typeof boardSize === 'string') {
    clues = await sql`SELECT id, user_id, number, word, ranked FROM clues WHERE board_size = ${boardSize}`;
    const clueIds = clues.map((c) => c.id as string);
    if (clueIds.length > 0) {
      results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results WHERE (board_size = ${boardSize} OR clue_id = ANY(${clueIds}))`;
    } else {
      results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results WHERE board_size = ${boardSize}`;
    }
  } else {
    clues = await sql`SELECT id, user_id, number, word, ranked FROM clues`;
    results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results`;
  }

  // Group clues by user
  const cluesByUser = new Map<string, typeof clues>();
  for (const c of clues) {
    const uid = c.user_id as string;
    if (!cluesByUser.has(uid)) cluesByUser.set(uid, []);
    cluesByUser.get(uid)!.push(c);
  }

  // Group results by user
  const resultsByUser = new Map<string, typeof results>();
  for (const r of results) {
    const uid = r.user_id as string;
    if (!resultsByUser.has(uid)) resultsByUser.set(uid, []);
    resultsByUser.get(uid)!.push(r);
  }

  // Build clue ranked lookup
  const clueRankedMap = new Map<string, boolean>();
  for (const c of clues) {
    clueRankedMap.set(c.id as string, c.ranked !== false);
  }

  // Spymasters — ranked clues only, exclude clue-0 from avg words
  const rankedCluesByUser = new Map<string, typeof clues>();
  for (const c of clues) {
    if (c.ranked === false) continue;
    const uid = c.user_id as string;
    if (!rankedCluesByUser.has(uid)) rankedCluesByUser.set(uid, []);
    rankedCluesByUser.get(uid)!.push(c);
  }

  const spymasters = Array.from(rankedCluesByUser.entries()).map(([userId, userClues]) => {
    const nonZeroClues = userClues.filter((c) => Number(c.number) > 0);
    const avgWordsPerClue = nonZeroClues.length > 0
      ? nonZeroClues.reduce((s, c) => s + Number(c.number), 0) / nonZeroClues.length
      : 0;
    const clueIds = new Set(userClues.map((c) => c.id as string));
    const othersResults = results.filter((r) => clueIds.has(r.clue_id as string) && r.user_id !== userId);
    const avgScoreOnClues = othersResults.length > 0
      ? othersResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / othersResults.length
      : 0;
    return {
      userId,
      cluesGiven: userClues.length,
      avgWordsPerClue: Math.round(avgWordsPerClue * 10) / 10,
      avgScoreOnClues: Math.round(avgScoreOnClues * 10) / 10,
    };
  }).sort((a, b) => b.avgScoreOnClues - a.avgScoreOnClues);

  // Guessers — ranked results only
  const rankedResultsByUser = new Map<string, typeof results>();
  for (const r of results) {
    const clueId = r.clue_id as string;
    if (!clueRankedMap.get(clueId)) continue;
    const uid = r.user_id as string;
    if (!rankedResultsByUser.has(uid)) rankedResultsByUser.set(uid, []);
    rankedResultsByUser.get(uid)!.push(r);
  }

  const guessers = Array.from(rankedResultsByUser.entries()).map(([userId, userResults]) => {
    const avgWordsPicked = userResults.reduce((s, r) => s + ((r.guessed_indices as number[])?.length || 0), 0) / userResults.length;
    const avgScore = userResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / userResults.length;
    return {
      userId,
      cluesSolved: userResults.length,
      avgWordsPicked: Math.round(avgWordsPicked * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  // Per-clue stats
  const resultsByClue = new Map<string, typeof results>();
  for (const r of results) {
    const cid = r.clue_id as string;
    if (!resultsByClue.has(cid)) resultsByClue.set(cid, []);
    resultsByClue.get(cid)!.push(r);
  }

  // Fetch all ratings for rating stats per clue
  const ratings: Record<string, unknown>[] = await sql`SELECT clue_id, rating FROM ratings`;
  const ratingsByClue = new Map<string, number[]>();
  for (const r of ratings) {
    const cid = r.clue_id as string;
    if (!ratingsByClue.has(cid)) ratingsByClue.set(cid, []);
    ratingsByClue.get(cid)!.push(Number(r.rating));
  }

  const clueStats = clues.map((c) => {
    const clueResults = resultsByClue.get(c.id as string) || [];
    const attempts = clueResults.length;
    const avgScore = attempts > 0
      ? Math.round(clueResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / attempts * 10) / 10
      : 0;
    const clueRatings = ratingsByClue.get(c.id as string) || [];
    const ratingsCount = clueRatings.length;
    const avgRating = ratingsCount > 0
      ? Math.round(clueRatings.reduce((s, v) => s + v, 0) / ratingsCount * 10) / 10
      : 0;
    return {
      id: c.id as string,
      word: c.word as string,
      number: Number(c.number),
      userId: c.user_id as string,
      ranked: c.ranked ?? true,
      attempts,
      avgScore,
      createdAt: Number(c.created_at) || 0,
      ratingsCount,
      avgRating,
    };
  }).sort((a, b) => b.attempts - a.attempts);

  res.json({ spymasters, guessers, clueStats });
}
