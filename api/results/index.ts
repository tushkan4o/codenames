import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const result = req.body;
  if (!result?.clueId || !result?.userId) return res.status(400).json({ error: 'Invalid result data' });

  const sql = neon(process.env.DATABASE_URL!);

  try {
    // Ensure user exists
    await sql`INSERT INTO users (id, display_name, created_at)
      VALUES (${result.userId}, ${result.userId}, ${result.timestamp})
      ON CONFLICT (id) DO NOTHING`;

    await sql`INSERT INTO results (clue_id, user_id, guessed_indices, correct_count, total_targets, score, timestamp, board_size)
      VALUES (${result.clueId}, ${result.userId}, ${result.guessedIndices}, ${result.correctCount}, ${result.totalTargets}, ${result.score}, ${result.timestamp}, ${result.boardSize || null})`;
    res.json({ ok: true });
  } catch (err: unknown) {
    // Duplicate — already solved
    if (err && typeof err === 'object' && 'code' in err && (err as Record<string, unknown>).code === '23505') {
      return res.json({ ok: true, duplicate: true });
    }
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
