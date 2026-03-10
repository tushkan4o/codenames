import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

async function checkAdmin(sql: ReturnType<typeof neon>, adminId: string): Promise<boolean> {
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${adminId}` as Record<string, unknown>[];
  return rows.length > 0 && rows[0].is_admin === true;
}

async function deleteClueCascade(sql: ReturnType<typeof neon>, clueId: string) {
  await sql`DELETE FROM comments WHERE clue_id = ${clueId}`;
  await sql`DELETE FROM reports WHERE clue_id = ${clueId}`;
  await sql`DELETE FROM ratings WHERE clue_id = ${clueId}`;
  await sql`DELETE FROM results WHERE clue_id = ${clueId}`;
  await sql`DELETE FROM clues WHERE id = ${clueId}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = neon(process.env.DATABASE_URL!);
  const { action, adminId } = req.query;

  // Init must run before admin check (it creates the is_admin column)
  if (action === 'init') {
    return handleInit(req, res);
  }

  // Debug endpoint
  if (action === 'debug') {
    return res.json({ action, adminId, method: req.method, query: req.query, url: req.url });
  }

  if (!adminId || typeof adminId !== 'string') {
    return res.status(400).json({ error: 'adminId required' });
  }

  const isAdmin = await checkAdmin(sql, adminId);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (req.method === 'GET') {
    if (action === 'clues') {
      const rows = await sql`
        SELECT c.*,
          COALESCE(rp.report_count, 0) as report_count,
          COALESCE(rs.attempt_count, 0) as attempt_count,
          COALESCE(rs.avg_score, 0) as avg_score
        FROM clues c
        LEFT JOIN (
          SELECT clue_id, COUNT(*)::int as report_count
          FROM reports
          GROUP BY clue_id
        ) rp ON rp.clue_id = c.id
        LEFT JOIN (
          SELECT clue_id, COUNT(*)::int as attempt_count, ROUND(AVG(score)::numeric, 1) as avg_score
          FROM results
          GROUP BY clue_id
        ) rs ON rs.clue_id = c.id
        ORDER BY c.created_at DESC
      `;
      return res.json(rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        word: row.word,
        number: row.number,
        userId: row.user_id,
        boardSize: row.board_size,
        boardSeed: row.board_seed,
        wordPack: row.word_pack || 'ru',
        createdAt: Number(row.created_at),
        targetIndices: row.target_indices,
        nullIndices: row.null_indices || [],
        reportCount: Number(row.report_count) || 0,
        disabled: row.disabled || false,
        ranked: row.ranked ?? true,
        attempts: Number(row.attempt_count) || 0,
        avgScore: Number(row.avg_score) || 0,
        redCount: row.red_count != null ? Number(row.red_count) : null,
        blueCount: row.blue_count != null ? Number(row.blue_count) : null,
        assassinCount: row.assassin_count != null ? Number(row.assassin_count) : null,
      })));
    }

    if (action === 'ratings') {
      const { clueId } = req.query;
      if (!clueId || typeof clueId !== 'string') {
        return res.status(400).json({ error: 'clueId required' });
      }
      const rows = await sql`
        SELECT rating, COUNT(*)::int as cnt FROM ratings WHERE clue_id = ${clueId} GROUP BY rating ORDER BY rating
      `;
      const totalRows = await sql`
        SELECT COUNT(*)::int as total, COALESCE(AVG(rating), 0) as avg FROM ratings WHERE clue_id = ${clueId}
      `;
      const individualRows = await sql`
        SELECT r.user_id, r.rating, u.display_name
        FROM ratings r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.clue_id = ${clueId}
        ORDER BY r.rating DESC
      `;
      return res.json({
        counts: Object.fromEntries(rows.map((r: Record<string, unknown>) => [Number(r.rating), Number(r.cnt)])),
        total: Number(totalRows[0]?.total) || 0,
        avg: Math.round((Number(totalRows[0]?.avg) || 0) * 10) / 10,
        items: individualRows.map((r: Record<string, unknown>) => ({
          userId: r.user_id,
          displayName: r.display_name || r.user_id,
          rating: Number(r.rating),
        })),
      });
    }

    if (action === 'users') {
      const users = await sql`SELECT id, display_name, created_at, is_admin FROM users ORDER BY created_at DESC`;
      const clueCountRows = await sql`SELECT user_id, COUNT(*)::int as cnt FROM clues GROUP BY user_id`;
      const solveCountRows = await sql`SELECT user_id, COUNT(*)::int as cnt FROM results GROUP BY user_id`;
      const lastClueRows = await sql`SELECT user_id, MAX(created_at) as last_at FROM clues GROUP BY user_id`;
      const lastSolveRows = await sql`SELECT user_id, MAX(timestamp) as last_at FROM results GROUP BY user_id`;
      const avgScoreRows = await sql`SELECT user_id, ROUND(AVG(score)::numeric, 1) as avg FROM results GROUP BY user_id`;

      // Linked OAuth accounts per user
      const oauthRows = await sql`SELECT user_id, provider FROM oauth_accounts`;
      const oauthMap: Record<string, string[]> = {};
      for (const r of oauthRows) {
        const uid = r.user_id as string;
        if (!oauthMap[uid]) oauthMap[uid] = [];
        oauthMap[uid].push(r.provider as string);
      }

      // Ranked/casual split stats
      const rankedClueRows = await sql`SELECT user_id, COUNT(*)::int as cnt FROM clues WHERE ranked = true GROUP BY user_id`;
      const casualClueRows = await sql`SELECT user_id, COUNT(*)::int as cnt FROM clues WHERE ranked = false GROUP BY user_id`;
      const rankedSolveRows = await sql`SELECT r.user_id, COUNT(*)::int as cnt FROM results r JOIN clues c ON r.clue_id = c.id WHERE c.ranked = true GROUP BY r.user_id`;
      const casualSolveRows = await sql`SELECT r.user_id, COUNT(*)::int as cnt FROM results r JOIN clues c ON r.clue_id = c.id WHERE c.ranked = false GROUP BY r.user_id`;

      const rankedClueMap = Object.fromEntries(rankedClueRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.cnt)]));
      const casualClueMap = Object.fromEntries(casualClueRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.cnt)]));
      const rankedSolveMap = Object.fromEntries(rankedSolveRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.cnt)]));
      const casualSolveMap = Object.fromEntries(casualSolveRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.cnt)]));

      const clueCountMap = Object.fromEntries(clueCountRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.cnt)]));
      const solveCountMap = Object.fromEntries(solveCountRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.cnt)]));
      const lastClueMap = Object.fromEntries(lastClueRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.last_at)]));
      const lastSolveMap = Object.fromEntries(lastSolveRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.last_at)]));
      const avgScoreMap = Object.fromEntries(avgScoreRows.map((r: Record<string, unknown>) => [r.user_id, Number(r.avg)]));

      return res.json(users.map((u: Record<string, unknown>) => {
        const id = u.id as string;
        const lastClue = lastClueMap[id] || 0;
        const lastSolve = lastSolveMap[id] || 0;
        return {
          id,
          displayName: u.display_name,
          createdAt: Number(u.created_at),
          isAdmin: u.is_admin === true,
          cluesGiven: clueCountMap[id] || 0,
          cluesSolved: solveCountMap[id] || 0,
          avgScore: avgScoreMap[id] || 0,
          lastActivity: Math.max(lastClue, lastSolve, Number(u.created_at)),
          oauthProviders: oauthMap[id] || [],
          rankedCluesGiven: rankedClueMap[id] || 0,
          casualCluesGiven: casualClueMap[id] || 0,
          rankedCluesSolved: rankedSolveMap[id] || 0,
          casualCluesSolved: casualSolveMap[id] || 0,
        };
      }));
    }

    if (action === 'results') {
      const rows = await sql`
        SELECT r.*, c.word as clue_word, c.number as clue_number, c.board_size as clue_board_size, c.ranked as clue_ranked
        FROM results r
        LEFT JOIN clues c ON c.id = r.clue_id
        ORDER BY r.timestamp DESC
      `;
      return res.json(rows.map((row: Record<string, unknown>) => ({
        clueId: row.clue_id,
        userId: row.user_id,
        score: row.score,
        correctCount: row.correct_count,
        totalTargets: row.total_targets,
        timestamp: Number(row.timestamp),
        boardSize: row.board_size || row.clue_board_size,
        clueWord: row.clue_word || null,
        clueNumber: row.clue_number ?? null,
        ranked: row.clue_ranked ?? true,
        guessedIndices: row.guessed_indices || [],
      })));
    }

    if (action === 'reports') {
      const { clueId } = req.query;
      if (!clueId || typeof clueId !== 'string') {
        return res.status(400).json({ error: 'clueId required' });
      }
      const rows = await sql`
        SELECT * FROM reports WHERE clue_id = ${clueId} ORDER BY created_at DESC
      `;
      return res.json(rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        clueId: row.clue_id,
        userId: row.user_id,
        reason: row.reason,
        createdAt: Number(row.created_at),
      })));
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'PATCH') {
    if (action === 'updateClue') {
      const { clueId } = req.query;
      if (!clueId || typeof clueId !== 'string') {
        return res.status(400).json({ error: 'clueId required' });
      }

      const body = req.body || {};
      const updates: string[] = [];

      // Validate clue exists
      const existing = await sql`SELECT * FROM clues WHERE id = ${clueId}` as Record<string, unknown>[];
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Clue not found' });
      }

      // Update target_indices if provided (must be an array of integers)
      if ('targetIndices' in body) {
        const indices = body.targetIndices;
        if (!Array.isArray(indices) || !indices.every((i: unknown) => Number.isInteger(i) && (i as number) >= 0)) {
          return res.status(400).json({ error: 'targetIndices must be an array of non-negative integers' });
        }
        await sql`UPDATE clues SET target_indices = ${indices}::int[] WHERE id = ${clueId}`;
        updates.push('target_indices');
      }

      // Update number (word count) if provided
      if ('number' in body) {
        const num = body.number;
        if (!Number.isInteger(num) || num < 0) {
          return res.status(400).json({ error: 'number must be a non-negative integer' });
        }
        await sql`UPDATE clues SET number = ${num} WHERE id = ${clueId}`;
        updates.push('number');
      }

      // Update nullIndices if provided
      if ('nullIndices' in body) {
        const indices = body.nullIndices;
        if (!Array.isArray(indices) || !indices.every((i: unknown) => Number.isInteger(i) && (i as number) >= 0)) {
          return res.status(400).json({ error: 'nullIndices must be an array of non-negative integers' });
        }
        await sql`UPDATE clues SET null_indices = ${indices}::int[] WHERE id = ${clueId}`;
        updates.push('null_indices');
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update. Supported: targetIndices, number, nullIndices' });
      }

      return res.json({ ok: true, updated: updates });
    }

    if (action === 'renameUser') {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId required' });
      }
      const { newDisplayName } = req.body || {};
      if (!newDisplayName || typeof newDisplayName !== 'string') {
        return res.status(400).json({ error: 'newDisplayName required' });
      }
      const trimmed = newDisplayName.trim();
      if (trimmed.length < 2) return res.status(400).json({ error: 'name_too_short' });
      if (trimmed.length > 20) return res.status(400).json({ error: 'name_too_long' });
      if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) return res.status(400).json({ error: 'invalid_chars' });
      const existing = await sql`SELECT id, display_name FROM users WHERE id = ${userId}`;
      if (existing.length === 0) return res.status(404).json({ error: 'User not found' });
      // Save old name to history before renaming
      const oldName = existing[0].display_name as string;
      if (oldName !== trimmed) {
        await sql`INSERT INTO name_history (user_id, old_name, changed_at) VALUES (${userId}, ${oldName}, ${Date.now()})`;
      }
      await sql`UPDATE users SET display_name = ${trimmed} WHERE id = ${userId}`;
      return res.json({ ok: true, displayName: trimmed });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'DELETE') {
    if (action === 'deleteClue') {
      const { clueId } = req.query;
      if (!clueId || typeof clueId !== 'string') {
        return res.status(400).json({ error: 'clueId required' });
      }
      await deleteClueCascade(sql, clueId);
      return res.json({ ok: true });
    }

    if (action === 'deleteResult') {
      const { clueId, userId: resultUserId, timestamp } = req.query;
      if (!clueId || !resultUserId || !timestamp) {
        return res.status(400).json({ error: 'clueId, userId, timestamp required' });
      }
      await sql`DELETE FROM results WHERE clue_id = ${clueId as string} AND user_id = ${resultUserId as string} AND timestamp = ${Number(timestamp)}`;
      return res.json({ ok: true });
    }

    if (action === 'deleteUser') {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId required' });
      }

      // Get all clues by this user and delete them with cascade
      const userClues = await sql`SELECT id FROM clues WHERE user_id = ${userId}`;
      for (const clue of userClues) {
        await deleteClueCascade(sql, clue.id as string);
      }

      // Delete user's own activity on other clues
      await sql`DELETE FROM name_history WHERE user_id = ${userId}`;
      await sql`DELETE FROM profile_comments WHERE profile_user_id = ${userId} OR author_id = ${userId}`;
      await sql`DELETE FROM notifications WHERE user_id = ${userId}`;
      await sql`DELETE FROM comments WHERE user_id = ${userId}`;
      await sql`DELETE FROM reports WHERE user_id = ${userId}`;
      await sql`DELETE FROM ratings WHERE user_id = ${userId}`;
      await sql`DELETE FROM results WHERE user_id = ${userId}`;

      // Delete OAuth linked accounts
      await sql`DELETE FROM oauth_accounts WHERE user_id = ${userId}`;

      // Delete user
      await sql`DELETE FROM users WHERE id = ${userId}`;

      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// --- DB init (merged from db/init.ts) ---
async function handleInit(_req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not set' });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
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
    await sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at BIGINT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, actor_id TEXT, clue_id TEXT, clue_word TEXT, message TEXT, created_at BIGINT NOT NULL, read BOOLEAN DEFAULT false)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`;
    await sql`CREATE TABLE IF NOT EXISTS profile_comments (id SERIAL PRIMARY KEY, profile_user_id TEXT NOT NULL REFERENCES users(id), author_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at BIGINT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS feedback (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), message TEXT NOT NULL, screenshots TEXT[] DEFAULT '{}', created_at BIGINT NOT NULL)`;
    // Precomputed ratings
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS captain_rating INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS scout_rating INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS overall_rating INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ranked_clues_given INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ranked_clues_solved INT DEFAULT 0`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS clue_rating INT DEFAULT 0`;
    await sql`UPDATE users SET password = '1242', is_admin = true WHERE id = 'tushkan'`;
    res.json({ ok: true, message: 'Tables created/updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
