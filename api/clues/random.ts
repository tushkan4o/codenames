import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, wordPack, boardSize, exclude } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const sql = getDb();
  const excludeIds: string[] = exclude ? (typeof exclude === 'string' ? exclude.split(',') : exclude).filter(Boolean) : [];

  // Get clues the user already solved
  const solvedRows = await sql`SELECT clue_id FROM results WHERE user_id = ${userId as string}`;
  const solvedIds = solvedRows.map((r: Record<string, unknown>) => r.clue_id as string);

  // All IDs to exclude
  const allExcluded = [...new Set([...excludeIds, ...solvedIds])];

  // Build query - filter by user, wordPack, boardSize, and exclusions
  let rows;
  if (allExcluded.length > 0) {
    if (wordPack && boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND board_size = ${boardSize as string} AND id != ALL(${allExcluded}) ORDER BY RANDOM() LIMIT 1`;
    } else if (wordPack) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND id != ALL(${allExcluded}) ORDER BY RANDOM() LIMIT 1`;
    } else if (boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND board_size = ${boardSize as string} AND id != ALL(${allExcluded}) ORDER BY RANDOM() LIMIT 1`;
    } else {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND id != ALL(${allExcluded}) ORDER BY RANDOM() LIMIT 1`;
    }
  } else {
    if (wordPack && boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND board_size = ${boardSize as string} ORDER BY RANDOM() LIMIT 1`;
    } else if (wordPack) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} ORDER BY RANDOM() LIMIT 1`;
    } else if (boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND board_size = ${boardSize as string} ORDER BY RANDOM() LIMIT 1`;
    } else {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} ORDER BY RANDOM() LIMIT 1`;
    }
  }

  if (rows.length === 0) return res.json(null);

  const row = rows[0];
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
}
