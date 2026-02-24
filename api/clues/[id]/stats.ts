import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

  const sql = getDb();
  const rows = await sql`SELECT score FROM results WHERE clue_id = ${id}`;

  if (rows.length === 0) {
    return res.json({ attempts: 0, avgScore: 0, scores: [] });
  }

  const scores = rows.map((r: Record<string, unknown>) => Number(r.score) || 0);
  const totalScore = scores.reduce((s: number, v: number) => s + v, 0);

  res.json({
    attempts: rows.length,
    avgScore: Math.round((totalScore / rows.length) * 10) / 10,
    scores,
  });
}
