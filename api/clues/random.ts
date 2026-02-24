import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, wordPack, boardSize, exclude } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const excludeIds: string[] = exclude ? (typeof exclude === 'string' ? exclude.split(',') : exclude).filter(Boolean) : [];

    // Get clues the user already solved
    const solvedRows = await sql`SELECT clue_id FROM results WHERE user_id = ${userId as string}`;
    const solvedIds = solvedRows.map((r: Record<string, unknown>) => r.clue_id as string);

    // All IDs to exclude
    const allExcluded = [...new Set([...excludeIds, ...solvedIds])];

    // Get all candidate clues (not by this user, matching filters)
    let rows;
    if (wordPack && boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND board_size = ${boardSize as string} ORDER BY RANDOM() LIMIT 20`;
    } else if (wordPack) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} ORDER BY RANDOM() LIMIT 20`;
    } else if (boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND board_size = ${boardSize as string} ORDER BY RANDOM() LIMIT 20`;
    } else {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} ORDER BY RANDOM() LIMIT 20`;
    }

    // Filter out excluded IDs in JS (simpler than array SQL syntax)
    const excludeSet = new Set(allExcluded);
    const candidates = rows.filter((r: Record<string, unknown>) => !excludeSet.has(r.id as string));

    if (candidates.length === 0) return res.json(null);

    const row = candidates[0];
    res.json({
      id: row.id,
      word: row.word,
      number: row.number,
      boardSeed: row.board_seed,
      targetIndices: row.target_indices,
      createdAt: Number(row.created_at),
      userId: row.user_id,
      wordPack: row.word_pack,
      boardSize: row.board_size,
      reshuffleCount: row.reshuffle_count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
