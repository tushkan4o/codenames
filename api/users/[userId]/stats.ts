import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  const sql = getDb();

  // Get user's clues
  const clues = await sql`SELECT id, number FROM clues WHERE user_id = ${userId}`;
  const cluesGiven = clues.length;
  const avgWordsPerClue = cluesGiven > 0
    ? clues.reduce((s: number, c: Record<string, unknown>) => s + (Number(c.number) || 0), 0) / cluesGiven
    : 0;

  // Get results on user's clues (by others)
  let avgScoreOnClues = 0;
  if (cluesGiven > 0) {
    const clueIds = clues.map((c: Record<string, unknown>) => c.id as string);
    const othersResults = await sql`SELECT score FROM results WHERE clue_id = ANY(${clueIds}) AND user_id != ${userId}`;
    if (othersResults.length > 0) {
      avgScoreOnClues = othersResults.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.score) || 0), 0) / othersResults.length;
    }
  }

  // Get user's guess results
  const myResults = await sql`SELECT score, guessed_indices FROM results WHERE user_id = ${userId}`;
  const cluesSolved = myResults.length;
  const avgWordsPicked = cluesSolved > 0
    ? myResults.reduce((s: number, r: Record<string, unknown>) => s + ((r.guessed_indices as number[])?.length || 0), 0) / cluesSolved
    : 0;
  const avgScore = cluesSolved > 0
    ? myResults.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.score) || 0), 0) / cluesSolved
    : 0;

  res.json({
    cluesGiven,
    avgWordsPerClue: Math.round(avgWordsPerClue * 10) / 10,
    avgScoreOnClues: Math.round(avgScoreOnClues * 10) / 10,
    cluesSolved,
    avgWordsPicked: Math.round(avgWordsPicked * 10) / 10,
    avgScore: Math.round(avgScore * 10) / 10,
  });
}
