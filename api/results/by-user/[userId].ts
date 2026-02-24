import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM results WHERE user_id = ${userId} ORDER BY timestamp DESC`;

  res.json(rows.map((row: Record<string, unknown>) => ({
    clueId: row.clue_id,
    userId: row.user_id,
    guessedIndices: row.guessed_indices,
    correctCount: row.correct_count,
    totalTargets: row.total_targets,
    score: row.score,
    timestamp: Number(row.timestamp),
    boardSize: row.board_size,
  })));
}
