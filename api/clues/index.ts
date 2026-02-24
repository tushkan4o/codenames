import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clue = req.body;
  if (!clue?.id || !clue?.word) return res.status(400).json({ error: 'Invalid clue data' });

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Ensure user exists (in case login didn't create them)
    await sql`INSERT INTO users (id, display_name, created_at)
      VALUES (${clue.userId}, ${clue.userId}, ${clue.createdAt})
      ON CONFLICT (id) DO NOTHING`;

    await sql`INSERT INTO clues (id, word, number, board_seed, target_indices, created_at, user_id, word_pack, board_size, reshuffle_count)
      VALUES (${clue.id}, ${clue.word}, ${clue.number}, ${clue.boardSeed}, ${clue.targetIndices}, ${clue.createdAt}, ${clue.userId}, ${clue.wordPack}, ${clue.boardSize}, ${clue.reshuffleCount || 0})
      ON CONFLICT (id) DO NOTHING`;

    res.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
