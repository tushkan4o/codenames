import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL environment variable is not set' });
    }

    const sql = neon(process.env.DATABASE_URL!);

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

    res.status(200).json({ ok: true, message: 'Tables created successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
