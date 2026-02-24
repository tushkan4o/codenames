# Database Structure (localStorage)

The app uses browser localStorage as its persistence layer. All data is stored as JSON arrays under the following keys.

## Collections

### `codenames_users` — User accounts
Managed by `AuthContext.tsx`. Persisted on login/update.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Lowercased displayName (primary key) |
| `displayName` | string | Original casing username |
| `createdAt` | number | Unix timestamp ms |
| `preferences.language` | `'en' \| 'ru'` | UI language |
| `preferences.defaultWordPack` | `'en' \| 'ru'` | Default word pack |
| `preferences.defaultBoardSize` | `'4x4' \| '5x5'` | Default board size |
| `preferences.animationEnabled` | boolean | Card flip animations |

### `codenames_clues` — Spymaster clues
Created when a spymaster submits a clue. One record per clue given.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `{seed}-{timestamp}` (primary key) |
| `word` | string | The clue word (uppercase) |
| `number` | number | How many target words (auto from selection count) |
| `boardSeed` | string | Seed for deterministic board generation |
| `targetIndices` | number[] | Indices of red cards the spymaster targeted |
| `createdAt` | number | Unix timestamp ms |
| `userId` | string | Spymaster's user ID (FK → users.id) |
| `wordPack` | `'en' \| 'ru'` | Which word list was used |
| `boardSize` | `'4x4' \| '5x5'` | Board dimensions |
| `reshuffleCount` | number | How many times board was reshuffled before cluing |

### `codenames_results` — Guess results
Created when a guesser finishes a puzzle. **One record per (clueId, userId) pair** — duplicates are prevented.

| Field | Type | Description |
|-------|------|-------------|
| `clueId` | string | FK → clues.id |
| `guessedIndices` | number[] | Card indices the guesser picked (in order) |
| `correctCount` | number | How many picks matched targetIndices |
| `totalTargets` | number | clue.targetIndices.length |
| `score` | number | Computed: red=+1, blue=-1, assassin=0 total, floor 0 |
| `timestamp` | number | Unix timestamp ms |
| `userId` | string | Guesser's user ID (FK → users.id) |
| `boardSize` | BoardSize? | Board size (added later, optional for legacy) |

**Composite key**: `(clueId, userId)` — enforced at save time.

### `codenames_ratings` — Clue ratings
Guessers rate clues 1-5 stars after solving. Upserted (one per clue+user pair).

| Field | Type | Description |
|-------|------|-------------|
| `clueId` | string | FK → clues.id |
| `userId` | string | FK → users.id |
| `rating` | number | 1-5 star rating |

**Composite key**: `(clueId, userId)` — enforced at save time via upsert.

## Relationships

```
users.id ──┬──< clues.userId        (one user gives many clues)
            ├──< results.userId      (one user solves many clues)
            └──< ratings.userId      (one user rates many clues)

clues.id ──┬──< results.clueId      (one clue has many solve attempts)
            └──< ratings.clueId      (one clue has many ratings)
```

## Key Constraints
- A user cannot guess their own clues (`getRandomClue` filters by userId)
- A user can only solve each clue once (duplicate prevention in `saveGuessResult`)
- Already-solved clues are excluded from random clue selection
- Ratings are upserted: saving again overwrites the previous rating

## Computed Stats (on demand, not stored)
- **Spymaster stats**: cluesGiven, avgWordsPerClue, avgScoreOnClues (how well others did on their clues)
- **Guesser stats**: cluesSolved, avgWordsPicked, avgScore
- **Clue stats**: attempts count, avgScore, score distribution array
