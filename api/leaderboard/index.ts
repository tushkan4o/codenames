import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL!);
  const { route } = req.query;

  // Cache read-only endpoints at Vercel edge
  if (req.method === 'GET') {
    const isLeaderboard = route === 'leaderboard';
    res.setHeader('Cache-Control', isLeaderboard
      ? 's-maxage=60, stale-while-revalidate=120'
      : 's-maxage=30, stale-while-revalidate=60');
  }

  switch (route) {
    case 'leaderboard':
      return handleLeaderboard(req, res, sql);
    case 'stats':
      return handleUserStats(req, res, sql);
    default:
      return res.status(400).json({ error: 'Unknown route' });
  }
}

// ==================== LEADERBOARD ====================

async function handleLeaderboard(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { boardSize } = req.query;
  const hasBoardSize = boardSize && typeof boardSize === 'string';

  // All data is precomputed — run all 4 queries in parallel
  const clueStatsQuery = hasBoardSize
    ? sql`SELECT c.id, c.word, c.number, c.user_id, c.ranked, c.created_at,
        c.clue_rating, c.attempts, c.avg_score, c.ratings_count, c.avg_rating, c.disabled,
        u.display_name
      FROM clues c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.board_size = ${boardSize}
      ORDER BY c.attempts DESC`
    : sql`SELECT c.id, c.word, c.number, c.user_id, c.ranked, c.created_at,
        c.clue_rating, c.attempts, c.avg_score, c.ratings_count, c.avg_rating, c.disabled,
        u.display_name
      FROM clues c LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.attempts DESC`;

  const [spymasterRows, guesserRows, overallRows, clueStatsRows] = await Promise.all([
    sql`SELECT id as user_id, display_name, captain_rating, ranked_clues_given as clues_given,
      avg_words_per_clue as avg_words, avg_score_on_clues as avg_score
      FROM users WHERE clues_given > 0 ORDER BY captain_rating DESC`,
    sql`SELECT id as user_id, display_name, scout_rating, ranked_clues_solved as clues_solved,
      avg_words_picked as avg_picked, avg_score
      FROM users WHERE clues_solved > 0 ORDER BY scout_rating DESC`,
    sql`SELECT id as user_id, display_name, captain_rating, scout_rating, overall_rating as rating,
      ranked_clues_given, ranked_clues_solved
      FROM users WHERE (clues_given + clues_solved) > 0 ORDER BY overall_rating DESC`,
    clueStatsQuery,
  ]);

  const spymasters = spymasterRows.map((s: Record<string, unknown>) => ({
    userId: s.user_id as string,
    displayName: s.display_name as string,
    cluesGiven: Number(s.clues_given),
    avgWordsPerClue: Number(s.avg_words) || 0,
    avgScoreOnClues: Number(s.avg_score) || 0,
    captainRating: Number(s.captain_rating) || 0,
  }));

  const guessers = guesserRows.map((g: Record<string, unknown>) => ({
    userId: g.user_id as string,
    displayName: g.display_name as string,
    cluesSolved: Number(g.clues_solved),
    avgWordsPicked: Number(g.avg_picked) || 0,
    avgScore: Number(g.avg_score) || 0,
    scoutRating: Number(g.scout_rating) || 0,
  }));

  const overall = overallRows.map((o: Record<string, unknown>) => ({
    userId: o.user_id as string,
    displayName: o.display_name as string,
    rankedCluesGiven: Number(o.ranked_clues_given) || 0,
    rankedCluesSolved: Number(o.ranked_clues_solved) || 0,
    rating: Number(o.rating) || 0,
  }));

  const clueStats = clueStatsRows.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    word: c.word as string,
    number: Number(c.number),
    userId: c.user_id as string,
    displayName: (c.display_name as string) || (c.user_id as string),
    ranked: c.ranked ?? true,
    attempts: Number(c.attempts) || 0,
    avgScore: Number(c.avg_score) || 0,
    createdAt: Number(c.created_at) || 0,
    ratingsCount: Number(c.ratings_count) || 0,
    avgRating: Number(c.avg_rating) || 0,
    clueRating: Number(c.clue_rating) || 0,
    disabled: c.disabled || false,
  }));

  res.json({ spymasters, guessers, clueStats, overall });
}

// ==================== USER STATS ====================

async function handleUserStats(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Player search for mention autocomplete
  const { search } = req.query;
  if (search && typeof search === 'string') {
    const pattern = `%${search}%`;
    const rows = await sql`SELECT id, display_name FROM users WHERE display_name ILIKE ${pattern} LIMIT 10`;
    return res.json(rows.map((r: Record<string, unknown>) => ({ id: r.id as string, displayName: r.display_name as string })));
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  // Single query — all stats are precomputed
  const userRows = await sql`SELECT display_name, avatar_url, bio, country,
    captain_rating, scout_rating, overall_rating, ranked_clues_given, ranked_clues_solved,
    clues_given, avg_words_per_clue, avg_score_on_clues,
    clues_solved, avg_words_picked, avg_score
    FROM users WHERE id = ${userId}`;
  const u = userRows.length > 0 ? userRows[0] : null;

  res.json({
    displayName: u ? (u.display_name as string) : userId,
    cluesGiven: u ? Number(u.clues_given) || 0 : 0,
    avgWordsPerClue: u ? Number(u.avg_words_per_clue) || 0 : 0,
    avgScoreOnClues: u ? Number(u.avg_score_on_clues) || 0 : 0,
    cluesSolved: u ? Number(u.clues_solved) || 0 : 0,
    avgWordsPicked: u ? Number(u.avg_words_picked) || 0 : 0,
    avgScore: u ? Number(u.avg_score) || 0 : 0,
    rankedCluesGiven: u ? Number(u.ranked_clues_given) || 0 : 0,
    rankedCluesSolved: u ? Number(u.ranked_clues_solved) || 0 : 0,
    overallRating: u ? Number(u.overall_rating) || 0 : 0,
    captainRating: u ? Number(u.captain_rating) || 0 : 0,
    scoutRating: u ? Number(u.scout_rating) || 0 : 0,
    ...(u?.avatar_url ? { avatarUrl: u.avatar_url as string } : {}),
    ...(u?.bio ? { bio: u.bio as string } : {}),
    ...(u?.country ? { country: u.country as string } : {}),
  });
}
