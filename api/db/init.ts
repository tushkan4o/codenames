import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      error: 'DATABASE_URL not set. Please create a Neon Postgres database in your Vercel dashboard and link it to this project.',
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    await sql`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      preferences JSONB DEFAULT '{}'
    )`;

    await sql`CREATE TABLE IF NOT EXISTS clues (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      number INT NOT NULL,
      board_seed TEXT NOT NULL,
      target_indices INT[] NOT NULL,
      created_at BIGINT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      word_pack TEXT NOT NULL,
      board_size TEXT NOT NULL,
      reshuffle_count INT DEFAULT 0
    )`;

    await sql`CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      clue_id TEXT NOT NULL REFERENCES clues(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      guessed_indices INT[] NOT NULL,
      correct_count INT NOT NULL,
      total_targets INT NOT NULL,
      score INT NOT NULL,
      timestamp BIGINT NOT NULL,
      board_size TEXT,
      UNIQUE(clue_id, user_id)
    )`;

    await sql`CREATE TABLE IF NOT EXISTS ratings (
      clue_id TEXT NOT NULL REFERENCES clues(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      rating INT NOT NULL,
      PRIMARY KEY (clue_id, user_id)
    )`;

    // Migration: add null_indices column if not exists
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS null_indices INT[] DEFAULT '{}'`;

    // Migration: add password and is_admin columns to users
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`;

    // Create reports table
    await sql`CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      clue_id TEXT NOT NULL REFERENCES clues(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )`;

    // Seed tushkan as admin with password
    await sql`UPDATE users SET password = '1242', is_admin = true WHERE id = 'tushkan'`;

    // Rename invalid ".." user to Mysyk
    const dotUser = await sql`SELECT * FROM users WHERE id = '..'`;
    if (dotUser.length > 0) {
      const u = dotUser[0];
      // Ensure mysyk user exists
      await sql`INSERT INTO users (id, display_name, created_at, preferences, password, is_admin)
        VALUES ('mysyk', 'Mysyk', ${u.created_at}, ${u.preferences || '{}'}, ${u.password || null}, ${u.is_admin || false})
        ON CONFLICT (id) DO NOTHING`;
      // Delete conflicting rows in tables with unique constraints involving user_id
      await sql`DELETE FROM ratings WHERE user_id = '..' AND clue_id IN (SELECT clue_id FROM ratings WHERE user_id = 'mysyk')`;
      await sql`DELETE FROM results WHERE user_id = '..' AND clue_id IN (SELECT clue_id FROM results WHERE user_id = 'mysyk')`;
      // Now safe to update remaining rows
      await sql`UPDATE ratings SET user_id = 'mysyk' WHERE user_id = '..'`;
      await sql`UPDATE results SET user_id = 'mysyk' WHERE user_id = '..'`;
      await sql`UPDATE reports SET user_id = 'mysyk' WHERE user_id = '..'`.catch(() => {});
      await sql`UPDATE clues SET user_id = 'mysyk' WHERE user_id = '..'`;
      await sql`DELETE FROM users WHERE id = '..'`;
    }

    res.json({ ok: true, message: 'Tables created/updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
