import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, stats } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

  const sql = neon(process.env.DATABASE_URL!);

  if (stats === 'true') {
    const rows = await sql`SELECT score FROM results WHERE clue_id = ${id}`;

    if (rows.length === 0) {
      return res.json({ attempts: 0, avgScore: 0, scores: [] });
    }

    const scores = rows.map((r: Record<string, unknown>) => Number(r.score) || 0);
    const totalScore = scores.reduce((s: number, v: number) => s + v, 0);

    return res.json({
      attempts: rows.length,
      avgScore: Math.round((totalScore / rows.length) * 10) / 10,
      scores,
    });
  }

  const rows = await sql`SELECT * FROM clues WHERE id = ${id}`;

  if (rows.length === 0) return res.json(null);

  const row = rows[0];
  res.json({
    id: row.id,
    word: row.word,
    number: row.number,
    boardSeed: row.board_seed,
    targetIndices: row.target_indices,
    nullIndices: row.null_indices || [],
    createdAt: Number(row.created_at),
    userId: row.user_id,
    wordPack: row.word_pack,
    boardSize: row.board_size,
    reshuffleCount: row.reshuffle_count,
  });
}
