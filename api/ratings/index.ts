import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clueId, userId, rating, reason } = req.body;
  if (!clueId || !userId) return res.status(400).json({ error: 'Missing fields' });

  const sql = neon(process.env.DATABASE_URL!);

  // Report submission (has reason field)
  if (reason) {
    await sql`INSERT INTO reports (clue_id, user_id, reason, created_at)
      VALUES (${clueId}, ${userId}, ${reason}, ${Date.now()})`;
    return res.json({ ok: true });
  }

  // Rating submission
  if (rating == null) return res.status(400).json({ error: 'Missing rating or reason' });

  await sql`INSERT INTO ratings (clue_id, user_id, rating)
    VALUES (${clueId}, ${userId}, ${rating})
    ON CONFLICT (clue_id, user_id) DO UPDATE SET rating = ${rating}`;

  res.json({ ok: true });
}
