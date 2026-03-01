import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { displayName, preferences, password } = req.body;
  if (!displayName) return res.status(400).json({ error: 'displayName required' });

  const validName = /^[a-zA-Zа-яА-ЯёЁ ]+$/;
  if (!validName.test(displayName.trim())) {
    return res.status(400).json({ error: 'invalid_chars' });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const id = displayName.toLowerCase();
  const now = Date.now();

  // Check existing user
  const existing = await sql`SELECT * FROM users WHERE id = ${id}`;
  if (existing.length > 0) {
    const user = existing[0];

    // If user has a password set, require it
    if (user.password) {
      if (!password) {
        return res.status(401).json({ error: 'password_required' });
      }
      if (password !== user.password) {
        return res.status(401).json({ error: 'wrong_password' });
      }
    }

    if (preferences) {
      await sql`UPDATE users SET preferences = ${JSON.stringify(preferences)} WHERE id = ${id}`;
    }
    return res.json({ ...user, is_admin: user.is_admin || false });
  }

  await sql`INSERT INTO users (id, display_name, created_at, preferences)
    VALUES (${id}, ${displayName}, ${now}, ${JSON.stringify(preferences || {})})`;

  res.json({ id, display_name: displayName, created_at: now, preferences: preferences || {}, is_admin: false });
}
