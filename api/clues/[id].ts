import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

  const sql = getDb();
  const rows = await sql`SELECT * FROM clues WHERE id = ${id}`;

  if (rows.length === 0) return res.json(null);

  const row = rows[0];
  res.json({
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
  });
}
