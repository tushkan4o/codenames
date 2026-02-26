import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = neon(process.env.DATABASE_URL!);

  // GET: return clues by user (query param ?userId=...)
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

    const rows = await sql`SELECT * FROM clues WHERE user_id = ${userId} ORDER BY created_at DESC`;

    return res.json(rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      word: row.word,
      number: row.number,
      boardSeed: row.board_seed,
      targetIndices: row.target_indices,
      createdAt: Number(row.created_at),
      userId: row.user_id,
      wordPack: row.word_pack,
      boardSize: row.board_size,
      reshuffleCount: row.reshuffle_count,
    })));
  }

  // POST: save a new clue
  if (req.method === 'POST') {
    const clue = req.body;
    if (!clue?.id || !clue?.word) return res.status(400).json({ error: 'Invalid clue data' });

    try {
      await sql`INSERT INTO users (id, display_name, created_at)
        VALUES (${clue.userId}, ${clue.userId}, ${clue.createdAt})
        ON CONFLICT (id) DO NOTHING`;

      await sql`INSERT INTO clues (id, word, number, board_seed, target_indices, created_at, user_id, word_pack, board_size, reshuffle_count)
        VALUES (${clue.id}, ${clue.word}, ${clue.number}, ${clue.boardSeed}, ${clue.targetIndices}, ${clue.createdAt}, ${clue.userId}, ${clue.wordPack}, ${clue.boardSize}, ${clue.reshuffleCount || 0})
        ON CONFLICT (id) DO NOTHING`;

      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
