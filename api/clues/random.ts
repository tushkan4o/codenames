import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, wordPack, boardSize, exclude, countOnly, ranked } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const isRanked = ranked === 'false' ? false : true;

  try {
    const sql = neon(process.env.DATABASE_URL!);

    const solvedRows = await sql`SELECT clue_id FROM results WHERE user_id = ${userId as string}`;
    const solvedIds = solvedRows.map((r: Record<string, unknown>) => r.clue_id as string);
    const solvedSet = new Set(solvedIds);

    if (countOnly === 'true') {
      // Get all matching clue IDs to accurately count available (excluding solved)
      let clueRows;
      if (wordPack && boardSize) {
        clueRows = await sql`SELECT id, user_id FROM clues WHERE word_pack = ${wordPack as string} AND board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
      } else if (wordPack) {
        clueRows = await sql`SELECT id, user_id FROM clues WHERE word_pack = ${wordPack as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
      } else if (boardSize) {
        clueRows = await sql`SELECT id, user_id FROM clues WHERE board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
      } else {
        clueRows = await sql`SELECT id, user_id FROM clues WHERE (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
      }

      const totalCount = clueRows.length;
      const availableCount = clueRows.filter((r: Record<string, unknown>) =>
        r.user_id !== (userId as string) && !solvedSet.has(r.id as string)
      ).length;

      return res.json({
        available: availableCount,
        total: totalCount,
      });
    }

    const excludeIds: string[] = exclude ? (typeof exclude === 'string' ? exclude.split(',') : exclude).filter(Boolean) : [];
    const allExcluded = [...new Set([...excludeIds, ...solvedIds])];

    let rows;
    if (wordPack && boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked} ORDER BY RANDOM() LIMIT 20`;
    } else if (wordPack) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked} ORDER BY RANDOM() LIMIT 20`;
    } else if (boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked} ORDER BY RANDOM() LIMIT 20`;
    } else {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked} ORDER BY RANDOM() LIMIT 20`;
    }

    const excludeSet = new Set(allExcluded);
    const candidates = rows.filter((r: Record<string, unknown>) => !excludeSet.has(r.id as string));

    if (candidates.length === 0) return res.json(null);

    const row = candidates[0];
    // Don't include targetIndices/nullIndices — prevents cheating via F12
    res.json({
      id: row.id,
      word: row.word,
      number: row.number,
      boardSeed: row.board_seed,
      createdAt: Number(row.created_at),
      userId: row.user_id,
      wordPack: row.word_pack,
      boardSize: row.board_size,
      reshuffleCount: row.reshuffle_count,
      ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
