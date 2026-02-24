import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM clues WHERE user_id = ${userId} ORDER BY created_at DESC`;

  res.json(rows.map((row: Record<string, unknown>) => ({
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
