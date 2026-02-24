CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  preferences JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS clues (
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
);

CREATE TABLE IF NOT EXISTS results (
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
);

CREATE TABLE IF NOT EXISTS ratings (
  clue_id TEXT NOT NULL REFERENCES clues(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  rating INT NOT NULL,
  PRIMARY KEY (clue_id, user_id)
);
