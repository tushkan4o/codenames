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
    clues = await sql`SELECT id, user_id, number, word FROM clues WHERE board_size = ${boardSize}`;
    const clueIds = clues.map((c) => c.id as string);
    if (clueIds.length > 0) {
      results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results WHERE (board_size = ${boardSize} OR clue_id = ANY(${clueIds}))`;
    } else {
      results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results WHERE board_size = ${boardSize}`;
    }
  } else {
    clues = await sql`SELECT id, user_id, number, word FROM clues`;
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

  // Spymasters
  const spymasters = Array.from(cluesByUser.entries()).map(([userId, userClues]) => {
    const avgWordsPerClue = userClues.reduce((s, c) => s + (Number(c.number) || 0), 0) / userClues.length;
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

  // Guessers
  const guessers = Array.from(resultsByUser.entries()).map(([userId, userResults]) => {
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

  const clueStats = clues.map((c) => {
    const clueResults = resultsByClue.get(c.id as string) || [];
    const attempts = clueResults.length;
    const avgScore = attempts > 0
      ? Math.round(clueResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / attempts * 10) / 10
      : 0;
    return {
      id: c.id as string,
      word: c.word as string,
      number: Number(c.number),
      userId: c.user_id as string,
      attempts,
      avgScore,
    };
  }).sort((a, b) => b.attempts - a.attempts);

  res.json({ spymasters, guessers, clueStats });
}
