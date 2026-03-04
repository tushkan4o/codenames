import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { WORD_LIST_RU } from './_words-ru';

// --- Server-side board generation (mirrors src/lib/boardGenerator.ts) ---

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function createSeededRandom(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BoardColorConfig {
  totalCards: number;
  redCount: number;
  blueCount: number;
  assassinCount: number;
}

const BOARD_CONFIGS: Record<string, BoardColorConfig> = {
  '4x4': { totalCards: 16, redCount: 6, blueCount: 5, assassinCount: 1 },
  '5x5': { totalCards: 25, redCount: 10, blueCount: 9, assassinCount: 1 },
};

function generateBoardData(
  seed: string,
  boardSize: string,
  redCount?: number | null,
  blueCount?: number | null,
  assassinCount?: number | null,
): { words: string[]; colors: string[] } {
  const config = BOARD_CONFIGS[boardSize] || BOARD_CONFIGS['5x5'];
  const rCount = redCount ?? config.redCount;
  const bCount = blueCount ?? config.blueCount;
  const aCount = assassinCount ?? config.assassinCount;
  const totalCards = config.totalCards;
  const neutralCount = totalCards - rCount - bCount - aCount;

  const numericSeed = hashString(seed);
  const random = createSeededRandom(numericSeed);

  const startingTeam: 'red' | 'blue' = random() < 0.5 ? 'red' : 'blue';

  const words = [...WORD_LIST_RU];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  const selectedWords = words.slice(0, totalCards);

  const startCount = startingTeam === 'red' ? rCount : bCount;
  const otherCount = startingTeam === 'red' ? bCount : rCount;
  const otherTeam = startingTeam === 'red' ? 'blue' : 'red';

  const colors: string[] = [
    ...Array(startCount).fill(startingTeam),
    ...Array(otherCount).fill(otherTeam),
    ...Array(neutralCount).fill('neutral'),
    ...Array(aCount).fill('assassin'),
  ];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }

  return { words: selectedWords, colors };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = req.query.route as string;
  const sql = neon(process.env.DATABASE_URL!);

  switch (route) {
    case 'clues': return handleClues(req, res, sql);
    case 'clue': return handleClueById(req, res, sql);
    case 'results': return handleResults(req, res, sql);
    case 'ratings': return handleRatings(req, res, sql);
    case 'leaderboard': return handleLeaderboard(req, res, sql);
    case 'stats': return handleUserStats(req, res, sql);
    case 'session': return handleSessionCheck(req, res, sql);
    case 'init': return handleInit(res, sql);
    case 'debug': return res.json({ route, method: req.method, query: req.query, url: req.url });
    default: return res.status(400).json({ error: 'Unknown route' });
  }
}

// ==================== CLUES ====================

async function handleClues(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const action = req.query.action as string | undefined;

  if (action === 'random') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return handleRandom(req, res, sql);
  }

  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    const rows = await sql`SELECT c.*, u.display_name FROM clues c LEFT JOIN users u ON c.user_id = u.id WHERE c.user_id = ${userId} ORDER BY c.created_at DESC`;
    return res.json(rows.map((row: Record<string, unknown>) => ({
      id: row.id, word: row.word, number: row.number, boardSeed: row.board_seed,
      targetIndices: row.target_indices, nullIndices: row.null_indices || [],
      createdAt: Number(row.created_at), userId: row.user_id, userDisplayName: (row.display_name as string) || (row.user_id as string), wordPack: row.word_pack,
      boardSize: row.board_size, reshuffleCount: row.reshuffle_count,
      disabled: row.disabled || false, ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
    })));
  }

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

async function handleRandom(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const { userId, wordPack, boardSize, exclude, countOnly, ranked } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const isRanked = ranked === 'false' ? false : true;

  try {
    const solvedRows = await sql`SELECT clue_id FROM results WHERE user_id = ${userId as string}` as Record<string, unknown>[];
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
    const authorRows = await sql`SELECT display_name FROM users WHERE id = ${row.user_id as string}`;
    const userDisplayName = authorRows.length > 0 ? (authorRows[0].display_name as string) : (row.user_id as string);
    const boardData = generateBoardData(
      row.board_seed as string, row.board_size as string,
      row.red_count as number | null, row.blue_count as number | null, row.assassin_count as number | null,
    );
    res.json({
      id: row.id, word: row.word, number: row.number,
      words: boardData.words, colors: boardData.colors,
      createdAt: Number(row.created_at), userId: row.user_id, userDisplayName, wordPack: row.word_pack,
      boardSize: row.board_size, reshuffleCount: row.reshuffle_count,
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

// ==================== CLUE BY ID ====================

async function handleClueById(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const { id, stats, reveal } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

  if (req.method === 'PATCH') {
    const { disabled, userId } = req.body || {};
    if (typeof disabled !== 'boolean' || !userId) return res.status(400).json({ error: 'disabled (boolean) and userId required' });
    const rows = await sql`SELECT user_id FROM clues WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Clue not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Only the clue owner can toggle disabled' });
    await sql`UPDATE clues SET disabled = ${disabled} WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (stats === 'true') {
    const rows = await sql`SELECT user_id, score, guessed_indices, timestamp FROM results WHERE clue_id = ${id} ORDER BY timestamp ASC`;
    if (rows.length === 0) {
      return res.json({ attempts: 0, avgScore: 0, scores: [], pickCounts: {}, details: [] });
    }
    const scores = rows.map((r: Record<string, unknown>) => Number(r.score) || 0);
    const totalScore = scores.reduce((s: number, v: number) => s + v, 0);
    const pickCounts: Record<number, number> = {};
    for (const r of rows) {
      const indices = r.guessed_indices as number[] | null;
      if (indices) { for (const idx of indices) { pickCounts[idx] = (pickCounts[idx] || 0) + 1; } }
    }
    const userIds = [...new Set(rows.map((r: Record<string, unknown>) => r.user_id as string))];
    const userNameRows = userIds.length > 0 ? await sql`SELECT id, display_name FROM users WHERE id = ANY(${userIds})` : [];
    const nameMap = new Map(userNameRows.map((r: Record<string, unknown>) => [r.id as string, r.display_name as string]));
    const details = rows.map((r: Record<string, unknown>) => ({
      userId: r.user_id as string, displayName: nameMap.get(r.user_id as string) || (r.user_id as string),
      score: Number(r.score) || 0,
      timestamp: Number(r.timestamp), guessedIndices: r.guessed_indices as number[],
    }));
    const clueRows = await sql`SELECT created_at FROM clues WHERE id = ${id}`;
    const createdAt = clueRows.length > 0 ? Number(clueRows[0].created_at) : 0;
    const ratingRows = await sql`SELECT COUNT(*)::int as count, COALESCE(AVG(rating), 0) as avg FROM ratings WHERE clue_id = ${id}`;
    const ratingsCount = ratingRows.length > 0 ? Number(ratingRows[0].count) : 0;
    const avgRating = ratingRows.length > 0 ? Math.round(Number(ratingRows[0].avg) * 10) / 10 : 0;
    return res.json({
      attempts: rows.length, avgScore: Math.round((totalScore / rows.length) * 10) / 10,
      scores, pickCounts, details, createdAt, ratingsCount, avgRating,
    });
  }

  const rows = await sql`SELECT * FROM clues WHERE id = ${id}`;
  if (rows.length === 0) return res.json(null);
  const row = rows[0];
  const authorRows = await sql`SELECT display_name FROM users WHERE id = ${row.user_id as string}`;
  const userDisplayName = authorRows.length > 0 ? (authorRows[0].display_name as string) : (row.user_id as string);
  const includeTargets = reveal === 'true';
  if (includeTargets) {
    // Reveal mode (profile/admin) — include boardSeed + targets
    res.json({
      id: row.id, word: row.word, number: row.number, boardSeed: row.board_seed,
      createdAt: Number(row.created_at), userId: row.user_id, userDisplayName, wordPack: row.word_pack,
      boardSize: row.board_size, reshuffleCount: row.reshuffle_count,
      disabled: row.disabled || false, ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
      targetIndices: row.target_indices, nullIndices: row.null_indices || [],
    });
  } else {
    // Guessing mode — return words+colors, NO boardSeed
    const boardData = generateBoardData(
      row.board_seed as string, row.board_size as string,
      row.red_count as number | null, row.blue_count as number | null, row.assassin_count as number | null,
    );
    res.json({
      id: row.id, word: row.word, number: row.number,
      words: boardData.words, colors: boardData.colors,
      createdAt: Number(row.created_at), userId: row.user_id, userDisplayName, wordPack: row.word_pack,
      boardSize: row.board_size, reshuffleCount: row.reshuffle_count,
      disabled: row.disabled || false, ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
    });
  }
}

// ==================== RESULTS ====================

async function handleResults(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    const rows = await sql`SELECT * FROM results WHERE user_id = ${userId} ORDER BY timestamp DESC`;
    return res.json(rows.map((row: Record<string, unknown>) => ({
      clueId: row.clue_id, userId: row.user_id, guessedIndices: row.guessed_indices,
      correctCount: row.correct_count, totalTargets: row.total_targets,
      score: row.score, timestamp: Number(row.timestamp), boardSize: row.board_size,
    })));
  }

  if (req.method === 'POST') {
    const result = req.body;
    if (!result?.clueId || !result?.userId) return res.status(400).json({ error: 'Invalid result data' });
    try {
      const clueRows = await sql`SELECT target_indices, null_indices FROM clues WHERE id = ${result.clueId}`;
      if (clueRows.length === 0) return res.status(404).json({ error: 'Clue not found' });
      const targetIndices: number[] = clueRows[0].target_indices as number[];
      const nullIndices: number[] = (clueRows[0].null_indices as number[]) || [];
      const guessedSet = new Set(result.guessedIndices as number[]);
      const correctCount = targetIndices.filter((i: number) => guessedSet.has(i)).length;
      await sql`INSERT INTO users (id, display_name, created_at)
        VALUES (${result.userId}, ${result.userId}, ${result.timestamp})
        ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO results (clue_id, user_id, guessed_indices, correct_count, total_targets, score, timestamp, board_size)
        VALUES (${result.clueId}, ${result.userId}, ${result.guessedIndices}, ${correctCount}, ${targetIndices.length}, ${result.score}, ${result.timestamp}, ${result.boardSize || null})`;
      return res.json({ ok: true, targetIndices, nullIndices });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as Record<string, unknown>).code === '23505') {
        const clueRows = await sql`SELECT target_indices, null_indices FROM clues WHERE id = ${result.clueId}`;
        const targetIndices = clueRows.length > 0 ? clueRows[0].target_indices : [];
        const nullIndices = clueRows.length > 0 ? (clueRows[0].null_indices || []) : [];
        return res.json({ ok: true, duplicate: true, targetIndices, nullIndices });
      }
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== RATINGS ====================

async function handleRatings(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method === 'GET') {
    const { clueId, userId } = req.query;
    if (!clueId || !userId || typeof clueId !== 'string' || typeof userId !== 'string') {
      return res.status(400).json({ error: 'clueId and userId required' });
    }
    const rows = await sql`SELECT rating FROM ratings WHERE clue_id = ${clueId} AND user_id = ${userId}`;
    return res.json({ rating: rows.length > 0 ? rows[0].rating : null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clueId, userId, rating, reason } = req.body;
  if (!clueId || !userId) return res.status(400).json({ error: 'Missing fields' });

  if (reason) {
    await sql`INSERT INTO reports (clue_id, user_id, reason, created_at)
      VALUES (${clueId}, ${userId}, ${reason}, ${Date.now()})`;
    return res.json({ ok: true });
  }

  if (rating == null) return res.status(400).json({ error: 'Missing rating or reason' });
  await sql`INSERT INTO ratings (clue_id, user_id, rating)
    VALUES (${clueId}, ${userId}, ${rating})
    ON CONFLICT (clue_id, user_id) DO UPDATE SET rating = ${rating}`;
  res.json({ ok: true });
}

// ==================== LEADERBOARD ====================

async function handleLeaderboard(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { boardSize } = req.query;
  let clues: Record<string, unknown>[];
  let results: Record<string, unknown>[];

  if (boardSize && typeof boardSize === 'string') {
    clues = await sql`SELECT id, user_id, number, word, ranked, created_at FROM clues WHERE board_size = ${boardSize}`;
    const clueIds = clues.map((c) => c.id as string);
    if (clueIds.length > 0) {
      results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results WHERE (board_size = ${boardSize} OR clue_id = ANY(${clueIds}))`;
    } else {
      results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results WHERE board_size = ${boardSize}`;
    }
  } else {
    clues = await sql`SELECT id, user_id, number, word, ranked, created_at FROM clues`;
    results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results`;
  }

  const clueRankedMap = new Map<string, boolean>();
  for (const c of clues) { clueRankedMap.set(c.id as string, c.ranked !== false); }

  const rankedCluesByUser = new Map<string, typeof clues>();
  for (const c of clues) {
    if (c.ranked === false) continue;
    const uid = c.user_id as string;
    if (!rankedCluesByUser.has(uid)) rankedCluesByUser.set(uid, []);
    rankedCluesByUser.get(uid)!.push(c);
  }

  const spymasters = Array.from(rankedCluesByUser.entries()).map(([userId, userClues]) => {
    const nonZeroClues = userClues.filter((c) => Number(c.number) > 0);
    const avgWordsPerClue = nonZeroClues.length > 0
      ? nonZeroClues.reduce((s, c) => s + Number(c.number), 0) / nonZeroClues.length : 0;
    const clueIds = new Set(userClues.map((c) => c.id as string));
    const othersResults = results.filter((r) => clueIds.has(r.clue_id as string) && r.user_id !== userId);
    const avgScoreOnClues = othersResults.length > 0
      ? othersResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / othersResults.length : 0;
    return {
      userId, cluesGiven: userClues.length,
      avgWordsPerClue: Math.round(avgWordsPerClue * 10) / 10,
      avgScoreOnClues: Math.round(avgScoreOnClues * 10) / 10,
    };
  }).sort((a, b) => b.avgScoreOnClues - a.avgScoreOnClues);

  const rankedResultsByUser = new Map<string, typeof results>();
  for (const r of results) {
    if (!clueRankedMap.get(r.clue_id as string)) continue;
    const uid = r.user_id as string;
    if (!rankedResultsByUser.has(uid)) rankedResultsByUser.set(uid, []);
    rankedResultsByUser.get(uid)!.push(r);
  }

  const guessers = Array.from(rankedResultsByUser.entries()).map(([userId, userResults]) => {
    const avgWordsPicked = userResults.reduce((s, r) => s + ((r.guessed_indices as number[])?.length || 0), 0) / userResults.length;
    const avgScore = userResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / userResults.length;
    return {
      userId, cluesSolved: userResults.length,
      avgWordsPicked: Math.round(avgWordsPicked * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  const resultsByClue = new Map<string, typeof results>();
  for (const r of results) {
    const cid = r.clue_id as string;
    if (!resultsByClue.has(cid)) resultsByClue.set(cid, []);
    resultsByClue.get(cid)!.push(r);
  }

  const ratings: Record<string, unknown>[] = await sql`SELECT clue_id, rating FROM ratings`;
  const ratingsByClue = new Map<string, number[]>();
  for (const r of ratings) {
    const cid = r.clue_id as string;
    if (!ratingsByClue.has(cid)) ratingsByClue.set(cid, []);
    ratingsByClue.get(cid)!.push(Number(r.rating));
  }

  const clueStats = clues.map((c) => {
    const clueResults = resultsByClue.get(c.id as string) || [];
    const attempts = clueResults.length;
    const avgScore = attempts > 0
      ? Math.round(clueResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / attempts * 10) / 10 : 0;
    const clueRatings = ratingsByClue.get(c.id as string) || [];
    const ratingsCount = clueRatings.length;
    const avgRating = ratingsCount > 0
      ? Math.round(clueRatings.reduce((s, v) => s + v, 0) / ratingsCount * 10) / 10 : 0;
    return {
      id: c.id as string, word: c.word as string, number: Number(c.number),
      userId: c.user_id as string, ranked: c.ranked ?? true,
      attempts, avgScore, createdAt: Number(c.created_at) || 0, ratingsCount, avgRating,
    };
  }).sort((a, b) => b.attempts - a.attempts);

  res.json({ spymasters, guessers, clueStats });
}

// ==================== USER STATS ====================

async function handleUserStats(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  const userRows = await sql`SELECT display_name FROM users WHERE id = ${userId}`;
  const displayName = userRows.length > 0 ? (userRows[0].display_name as string) : userId;

  const clues = await sql`SELECT id, number FROM clues WHERE user_id = ${userId}`;
  const cluesGiven = clues.length;
  const avgWordsPerClue = cluesGiven > 0
    ? clues.reduce((s: number, c: Record<string, unknown>) => s + (Number(c.number) || 0), 0) / cluesGiven : 0;

  let avgScoreOnClues = 0;
  if (cluesGiven > 0) {
    const clueIds = clues.map((c: Record<string, unknown>) => c.id as string);
    const othersResults = await sql`SELECT score FROM results WHERE clue_id = ANY(${clueIds}) AND user_id != ${userId}`;
    if (othersResults.length > 0) {
      avgScoreOnClues = othersResults.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.score) || 0), 0) / othersResults.length;
    }
  }

  const myResults = await sql`SELECT score, guessed_indices FROM results WHERE user_id = ${userId}`;
  const cluesSolved = myResults.length;
  const avgWordsPicked = cluesSolved > 0
    ? myResults.reduce((s: number, r: Record<string, unknown>) => s + ((r.guessed_indices as number[])?.length || 0), 0) / cluesSolved : 0;
  const avgScore = cluesSolved > 0
    ? myResults.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.score) || 0), 0) / cluesSolved : 0;

  res.json({
    displayName, cluesGiven, avgWordsPerClue: Math.round(avgWordsPerClue * 10) / 10,
    avgScoreOnClues: Math.round(avgScoreOnClues * 10) / 10, cluesSolved,
    avgWordsPicked: Math.round(avgWordsPicked * 10) / 10, avgScore: Math.round(avgScore * 10) / 10,
  });
}

// ==================== SESSION CHECK ====================

async function handleSessionCheck(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
  const rows = await sql`SELECT session_version FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ sessionVersion: Number(rows[0].session_version) || 0 });
}

// ==================== DB INIT ====================

async function handleInit(res: VercelResponse, sql: ReturnType<typeof neon>) {
  try {
    await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, created_at BIGINT NOT NULL, preferences JSONB DEFAULT '{}')`;
    await sql`CREATE TABLE IF NOT EXISTS clues (id TEXT PRIMARY KEY, word TEXT NOT NULL, number INT NOT NULL, board_seed TEXT NOT NULL, target_indices INT[] NOT NULL, created_at BIGINT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), word_pack TEXT NOT NULL, board_size TEXT NOT NULL, reshuffle_count INT DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS results (id SERIAL PRIMARY KEY, clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), guessed_indices INT[] NOT NULL, correct_count INT NOT NULL, total_targets INT NOT NULL, score INT NOT NULL, timestamp BIGINT NOT NULL, board_size TEXT, UNIQUE(clue_id, user_id))`;
    await sql`CREATE TABLE IF NOT EXISTS ratings (clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), rating INT NOT NULL, PRIMARY KEY (clue_id, user_id))`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS null_indices INT[] DEFAULT '{}'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`;
    await sql`CREATE TABLE IF NOT EXISTS reports (id SERIAL PRIMARY KEY, clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, created_at BIGINT NOT NULL)`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS ranked BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS red_count INT`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS blue_count INT`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS assassin_count INT`;
    await sql`CREATE TABLE IF NOT EXISTS oauth_accounts (provider TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), email TEXT, provider_name TEXT, linked_at BIGINT NOT NULL, PRIMARY KEY (provider, provider_id))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT DEFAULT 0`;
    await sql`UPDATE users SET password = '1242', is_admin = true WHERE id = 'tushkan'`;
    res.json({ ok: true, message: 'Tables created/updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
