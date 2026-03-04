import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = neon(process.env.DATABASE_URL!);
  const action = req.query.action as string | undefined;

  // --- Random clue ---
  if (action === 'random') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return handleRandom(req, res, sql);
  }

  // --- GET: list clues by user ---
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

    const rows = await sql`SELECT * FROM clues WHERE user_id = ${userId} ORDER BY created_at DESC`;

    return res.json(rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      word: row.word,
      number: row.number,
      boardSeed: row.board_seed,
      targetIndices: row.target_indices,
      nullIndices: row.null_indices || [],
      createdAt: Number(row.created_at),
      userId: row.user_id,
      wordPack: row.word_pack,
      boardSize: row.board_size,
      reshuffleCount: row.reshuffle_count,
      disabled: row.disabled || false,
      ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
    })));
  }

  // --- POST: save clue ---
  if (req.method === 'POST') {
    const clue = req.body;
    if (!clue?.id || !clue?.word) return res.status(400).json({ error: 'Invalid clue data' });

    try {
      await sql`INSERT INTO users (id, display_name, created_at)
        VALUES (${clue.userId}, ${clue.userId}, ${clue.createdAt})
        ON CONFLICT (id) DO NOTHING`;

      await sql`INSERT INTO clues (id, word, number, board_seed, target_indices, null_indices, created_at, user_id, word_pack, board_size, reshuffle_count, ranked, red_count, blue_count, assassin_count)
        VALUES (${clue.id}, ${clue.word}, ${clue.number}, ${clue.boardSeed}, ${clue.targetIndices}, ${clue.nullIndices || []}, ${clue.createdAt}, ${clue.userId}, ${clue.wordPack || 'ru'}, ${clue.boardSize}, ${clue.reshuffleCount || 0}, ${clue.ranked ?? true}, ${clue.redCount || null}, ${clue.blueCount || null}, ${clue.assassinCount || null})
        ON CONFLICT (id) DO NOTHING`;

      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// --- Random clue handler (merged from random.ts) ---

async function handleRandom(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const { userId, wordPack, boardSize, exclude, countOnly, ranked } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const isRanked = ranked === 'false' ? false : true;

  try {
    const solvedRows = await sql`SELECT clue_id FROM results WHERE user_id = ${userId as string}`;
    const solvedIds = solvedRows.map((r: Record<string, unknown>) => r.clue_id as string);
    const solvedSet = new Set(solvedIds);

    if (countOnly === 'true') {
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

      return res.json({ available: availableCount, total: totalCount });
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
