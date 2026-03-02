import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'PATCH') {
    const { disabled, userId } = req.body || {};
    const { id: clueId } = req.query;
    if (!clueId || typeof clueId !== 'string') return res.status(400).json({ error: 'id required' });
    if (typeof disabled !== 'boolean' || !userId) return res.status(400).json({ error: 'disabled (boolean) and userId required' });

    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT user_id FROM clues WHERE id = ${clueId}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Clue not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Only the clue owner can toggle disabled' });

    await sql`UPDATE clues SET disabled = ${disabled} WHERE id = ${clueId}`;
    return res.json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, stats, reveal } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

  const sql = neon(process.env.DATABASE_URL!);

  if (stats === 'true') {
    const rows = await sql`SELECT user_id, score, guessed_indices, timestamp FROM results WHERE clue_id = ${id} ORDER BY timestamp ASC`;

    if (rows.length === 0) {
      return res.json({ attempts: 0, avgScore: 0, scores: [], pickCounts: {}, details: [] });
    }

    const scores = rows.map((r: Record<string, unknown>) => Number(r.score) || 0);
    const totalScore = scores.reduce((s: number, v: number) => s + v, 0);

    // Count how many times each card index was picked
    const pickCounts: Record<number, number> = {};
    for (const r of rows) {
      const indices = r.guessed_indices as number[] | null;
      if (indices) {
        for (const idx of indices) {
          pickCounts[idx] = (pickCounts[idx] || 0) + 1;
        }
      }
    }

    // Per-attempt details
    const details = rows.map((r: Record<string, unknown>) => ({
      userId: r.user_id as string,
      score: Number(r.score) || 0,
      timestamp: Number(r.timestamp),
      guessedIndices: r.guessed_indices as number[],
    }));

    // Fetch clue creation date
    const clueRows = await sql`SELECT created_at FROM clues WHERE id = ${id}`;
    const createdAt = clueRows.length > 0 ? Number(clueRows[0].created_at) : 0;

    return res.json({
      attempts: rows.length,
      avgScore: Math.round((totalScore / rows.length) * 10) / 10,
      scores,
      pickCounts,
      details,
      createdAt,
    });
  }

  const rows = await sql`SELECT * FROM clues WHERE id = ${id}`;

  if (rows.length === 0) return res.json(null);

  const row = rows[0];

  // Only include targetIndices/nullIndices when reveal=true (after game ends)
  // This prevents cheating via F12 devtools
  const includeTargets = reveal === 'true';

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
    disabled: row.disabled || false,
    ranked: row.ranked ?? true,
    ...(row.red_count != null ? { redCount: row.red_count } : {}),
    ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
    ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
    ...(includeTargets ? {
      targetIndices: row.target_indices,
      nullIndices: row.null_indices || [],
    } : {}),
  });
}
