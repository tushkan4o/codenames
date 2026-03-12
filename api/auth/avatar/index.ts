import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Content-Type must be an image' });
    }

    // Read raw body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    if (body.length > 512 * 1024) {
      return res.status(400).json({ error: 'File too large (max 512KB)' });
    }

    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const filename = `avatars/${userId}-${Date.now()}.${ext}`;

    const blob = await put(filename, body, {
      access: 'public',
      contentType,
    });

    const sql = neon(process.env.DATABASE_URL!) as any;
    await sql`UPDATE users SET avatar_url = ${blob.url} WHERE id = ${userId}`;

    res.json({ avatarUrl: blob.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
