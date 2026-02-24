import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clueId, userId, rating } = req.body;
  if (!clueId || !userId || rating == null) return res.status(400).json({ error: 'Missing fields' });

  const sql = getDb();

  await sql`INSERT INTO ratings (clue_id, user_id, rating)
    VALUES (${clueId}, ${userId}, ${rating})
    ON CONFLICT (clue_id, user_id) DO UPDATE SET rating = ${rating}`;

  res.json({ ok: true });
}
