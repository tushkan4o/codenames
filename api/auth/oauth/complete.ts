import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyToken } from './lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, displayName } = req.body;
  if (!token || !displayName) return res.status(400).json({ error: 'Token and displayName required' });

  const payload = verifyToken(token);
  if (!payload || payload.type !== 'register') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Validate display name (same rules as login)
  const trimmed = displayName.trim();
  if (trimmed.length < 2) return res.status(400).json({ error: 'name_too_short' });
  if (trimmed.length > 20) return res.status(400).json({ error: 'name_too_long' });
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) {
    return res.status(400).json({ error: 'invalid_chars' });
  }

  const id = trimmed.toLowerCase();
  const now = Date.now();
  const sql = neon(process.env.DATABASE_URL!);

  // Check if name is taken
  const existing = await sql`SELECT id FROM users WHERE id = ${id}`;
  if (existing.length > 0) {
    return res.status(409).json({ error: 'name_taken' });
  }

  // Create user
  await sql`INSERT INTO users (id, display_name, created_at, preferences)
    VALUES (${id}, ${trimmed}, ${now}, ${JSON.stringify({})})`;

  // Link OAuth account
  const provider = payload.provider as string;
  const providerId = payload.providerId as string;
  const providerName = payload.providerName as string;
  const email = payload.email as string | null;

  await sql`INSERT INTO oauth_accounts (provider, provider_id, user_id, email, provider_name, linked_at)
    VALUES (${provider}, ${providerId}, ${id}, ${email}, ${providerName}, ${now})`;

  res.json({ id, display_name: trimmed, created_at: now, preferences: {}, is_admin: false });
}
