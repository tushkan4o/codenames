import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT provider, provider_name, email, linked_at FROM oauth_accounts WHERE user_id = ${userId}`;

  res.json(rows.map((r) => ({
    provider: r.provider,
    providerName: r.provider_name,
    email: r.email,
    linkedAt: Number(r.linked_at),
  })));
}
