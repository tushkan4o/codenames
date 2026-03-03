import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, provider } = req.body;
  if (!userId || !provider) return res.status(400).json({ error: 'userId and provider required' });

  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM oauth_accounts WHERE user_id = ${userId} AND provider = ${provider}`;

  res.json({ ok: true });
}
