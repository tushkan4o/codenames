import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clue = req.body;
  if (!clue?.id || !clue?.word) return res.status(400).json({ error: 'Invalid clue data' });

  const sql = getDb();

  await sql`INSERT INTO clues (id, word, number, board_seed, target_indices, created_at, user_id, word_pack, board_size, reshuffle_count)
    VALUES (${clue.id}, ${clue.word}, ${clue.number}, ${clue.boardSeed}, ${clue.targetIndices}, ${clue.createdAt}, ${clue.userId}, ${clue.wordPack}, ${clue.boardSize}, ${clue.reshuffleCount || 0})
    ON CONFLICT (id) DO NOTHING`;

  res.json({ ok: true });
}
