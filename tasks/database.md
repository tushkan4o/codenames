# Database Structure (Neon PostgreSQL)

The app uses Neon serverless PostgreSQL. Schema is initialized via `GET /api/db/init` which creates tables and runs migrations.

## Tables

### `users` — User accounts
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | Lowercased display name |
| `display_name` | TEXT NOT NULL | Original casing username |
| `created_at` | BIGINT NOT NULL | Unix timestamp ms |
| `preferences` | JSONB DEFAULT '{}' | UserPreferences object |
| `password` | TEXT | Optional password protection |
| `is_admin` | BOOLEAN DEFAULT false | Admin flag |

### `clues` — Spymaster clues
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | `{seed}-{timestamp}` |
| `word` | TEXT NOT NULL | Clue word (uppercase) |
| `number` | INT NOT NULL | Target count (0 for clue-0) |
| `board_seed` | TEXT NOT NULL | Seed for deterministic board generation |
| `target_indices` | INT[] NOT NULL | Indices of red cards targeted |
| `null_indices` | INT[] DEFAULT '{}' | Indices to exclude (clue-0) |
| `created_at` | BIGINT NOT NULL | Unix timestamp ms |
| `user_id` | TEXT NOT NULL FK→users | Spymaster's user ID |
| `word_pack` | TEXT NOT NULL | Word list ('ru') |
| `board_size` | TEXT NOT NULL | '4x4' or '5x5' |
| `reshuffle_count` | INT DEFAULT 0 | Reshuffles before cluing |
| `disabled` | BOOLEAN DEFAULT false | Admin can disable bad clues |
| `ranked` | BOOLEAN DEFAULT true | Affects leaderboard |
| `red_count` | INT | Custom color counts (casual mode) |
| `blue_count` | INT | |
| `assassin_count` | INT | |

### `results` — Guess results
One record per (clueId, userId) pair.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment |
| `clue_id` | TEXT NOT NULL FK→clues | Which clue was solved |
| `user_id` | TEXT NOT NULL FK→users | Who solved it |
| `guessed_indices` | INT[] NOT NULL | Cards picked (in order) |
| `correct_count` | INT NOT NULL | Computed server-side |
| `total_targets` | INT NOT NULL | From clue.targetIndices.length |
| `score` | INT NOT NULL | Scoring function result |
| `timestamp` | BIGINT NOT NULL | Unix timestamp ms |
| `board_size` | TEXT | Board size used |

**Unique constraint**: `(clue_id, user_id)`

### `ratings` — Clue ratings (1-5 stars)
| Column | Type | Description |
|--------|------|-------------|
| `clue_id` | TEXT NOT NULL FK→clues | |
| `user_id` | TEXT NOT NULL FK→users | |
| `rating` | INT NOT NULL | 1-5 |

**Primary key**: `(clue_id, user_id)` — upsert on save.

### `reports` — Clue reports
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | |
| `clue_id` | TEXT NOT NULL FK→clues | |
| `user_id` | TEXT NOT NULL FK→users | Reporter |
| `reason` | TEXT NOT NULL | Report reason |
| `created_at` | BIGINT NOT NULL | |

## Relationships

```
users.id ──┬──< clues.user_id       (one user gives many clues)
            ├──< results.user_id     (one user solves many clues)
            ├──< ratings.user_id     (one user rates many clues)
            └──< reports.user_id     (one user reports many clues)

clues.id ──┬──< results.clue_id     (one clue has many solve attempts)
            ├──< ratings.clue_id     (one clue has many ratings)
            └──< reports.clue_id     (one clue has many reports)
```

## Key Constraints
- A user cannot guess their own clues (`getRandomClue` filters by userId)
- A user can only solve each clue once (UNIQUE constraint on results)
- Already-solved clues are excluded from random clue selection
- Ratings are upserted: saving again overwrites the previous rating
- Score is computed server-side (red=+1, blue=-1, assassin=0 total, floor 0)

## Computed Stats (on demand, not stored)
- **Spymaster**: cluesGiven, avgWordsPerClue, avgScoreOnClues (ranked clues only)
- **Guesser**: cluesSolved, avgWordsPicked, avgScore (ranked results only)
- **Clue**: attempts count, avgScore, per-attempt details
