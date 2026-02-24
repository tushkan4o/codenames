import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { displayName, preferences } = req.body;
  if (!displayName) return res.status(400).json({ error: 'displayName required' });

  const sql = neon(process.env.DATABASE_URL!);
  const id = displayName.toLowerCase();
  const now = Date.now();

  // Upsert user
  const existing = await sql`SELECT * FROM users WHERE id = ${id}`;
  if (existing.length > 0) {
    if (preferences) {
      await sql`UPDATE users SET preferences = ${JSON.stringify(preferences)} WHERE id = ${id}`;
    }
    return res.json(existing[0]);
  }

  await sql`INSERT INTO users (id, display_name, created_at, preferences)
    VALUES (${id}, ${displayName}, ${now}, ${JSON.stringify(preferences || {})})`;

  res.json({ id, display_name: displayName, created_at: now, preferences: preferences || {} });
}
