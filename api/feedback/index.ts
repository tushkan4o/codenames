import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';

export const config = {
  api: { bodyParser: false },
};

async function readBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = neon(process.env.DATABASE_URL!) as any;
  const action = req.query.action as string;

  if (req.method === 'POST') {
    if (action === 'upload') {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const contentType = req.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({ error: 'Content-Type must be an image' });
      }

      try {
        const body = await readBody(req);
        if (body.length > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'File too large (max 5MB)' });
        }

        const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        const filename = `feedback/${userId}-${Date.now()}.${ext}`;

        const blob = await put(filename, body, { access: 'public', contentType });
        return res.json({ url: blob.url });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ error: message });
      }
    }

    if (action === 'submit') {
      try {
        const body = await readBody(req);
        const { userId, message, screenshots } = JSON.parse(body.toString());

        if (!userId || !message?.trim()) {
          return res.status(400).json({ error: 'userId and message required' });
        }

        await sql`
          INSERT INTO feedback (user_id, message, screenshots, created_at)
          VALUES (${userId}, ${message.trim()}, ${screenshots || []}, ${Date.now()})
        `;
        return res.json({ ok: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ error: message });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'GET') {
    if (action === 'list') {
      const adminId = req.query.adminId as string;
      if (!adminId) return res.status(400).json({ error: 'adminId required' });

      const adminCheck = await sql`SELECT is_admin FROM users WHERE id = ${adminId}`;
      if (!adminCheck.length || !adminCheck[0].is_admin) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const rows = await sql`
        SELECT f.id, f.user_id, f.message, f.screenshots, f.created_at, u.display_name
        FROM feedback f
        JOIN users u ON u.id = f.user_id
        ORDER BY f.created_at DESC
      `;
      return res.json(rows.map((r: Record<string, unknown>) => ({
        id: Number(r.id),
        userId: r.user_id,
        displayName: r.display_name,
        message: r.message,
        screenshots: r.screenshots || [],
        createdAt: Number(r.created_at),
      })));
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
