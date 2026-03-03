import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyToken } from './lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const payload = verifyToken(token);
  if (!payload || payload.type !== 'success') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = payload.userId as string;
  const sql = neon(process.env.DATABASE_URL!);

  const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const user = rows[0];
  res.json({ ...user, is_admin: user.is_admin || false });
}
