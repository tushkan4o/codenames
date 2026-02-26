import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, wordPack, boardSize } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Get solved clue IDs for this user
    const solvedRows = await sql`SELECT clue_id FROM results WHERE user_id = ${userId}`;
    const solvedIds = solvedRows.map((r: Record<string, unknown>) => r.clue_id as string);

    // Count available (not own, not solved) with filters
    let availableRows;
    let totalRows;

    if (wordPack && boardSize) {
      availableRows = await sql`SELECT COUNT(*) as cnt FROM clues WHERE user_id != ${userId} AND word_pack = ${wordPack as string} AND board_size = ${boardSize as string}`;
      totalRows = await sql`SELECT COUNT(*) as cnt FROM clues WHERE word_pack = ${wordPack as string} AND board_size = ${boardSize as string}`;
    } else if (wordPack) {
      availableRows = await sql`SELECT COUNT(*) as cnt FROM clues WHERE user_id != ${userId} AND word_pack = ${wordPack as string}`;
      totalRows = await sql`SELECT COUNT(*) as cnt FROM clues WHERE word_pack = ${wordPack as string}`;
    } else if (boardSize) {
      availableRows = await sql`SELECT COUNT(*) as cnt FROM clues WHERE user_id != ${userId} AND board_size = ${boardSize as string}`;
      totalRows = await sql`SELECT COUNT(*) as cnt FROM clues WHERE board_size = ${boardSize as string}`;
    } else {
      availableRows = await sql`SELECT COUNT(*) as cnt FROM clues WHERE user_id != ${userId}`;
      totalRows = await sql`SELECT COUNT(*) as cnt FROM clues`;
    }

    const totalCount = Number(totalRows[0].cnt);
    const availableCount = Number(availableRows[0].cnt) - solvedIds.length;

    res.json({
      available: Math.max(0, availableCount),
      total: totalCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
