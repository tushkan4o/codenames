import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = neon(process.env.DATABASE_URL!);

  // GET: return results by user (query param ?userId=...)
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

    const rows = await sql`SELECT * FROM results WHERE user_id = ${userId} ORDER BY timestamp DESC`;

    return res.json(rows.map((row: Record<string, unknown>) => ({
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

  // POST: save a guess result
  if (req.method === 'POST') {
    const result = req.body;
    if (!result?.clueId || !result?.userId) return res.status(400).json({ error: 'Invalid result data' });

    try {
      await sql`INSERT INTO users (id, display_name, created_at)
        VALUES (${result.userId}, ${result.userId}, ${result.timestamp})
        ON CONFLICT (id) DO NOTHING`;

      await sql`INSERT INTO results (clue_id, user_id, guessed_indices, correct_count, total_targets, score, timestamp, board_size)
        VALUES (${result.clueId}, ${result.userId}, ${result.guessedIndices}, ${result.correctCount}, ${result.totalTargets}, ${result.score}, ${result.timestamp}, ${result.boardSize || null})`;
      return res.json({ ok: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as Record<string, unknown>).code === '23505') {
        return res.json({ ok: true, duplicate: true });
      }
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
