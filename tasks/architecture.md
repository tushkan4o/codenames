# Project Architecture

## Tech Stack
- **Frontend**: React 19 + TypeScript 5.9 + Vite 7.3
- **Styling**: Tailwind CSS 3.4 + custom theme (`tailwind.config.js`)
- **Backend**: Vercel Serverless Functions (TypeScript)
- **Database**: Neon PostgreSQL (serverless) — see `tasks/database.md`
- **Icons**: Heroicons React
- **Routing**: React Router v7
- **Deployment**: Vercel (frontend + API same-origin)

## Directory Structure

```
codenames/
├── api/                          # Vercel Serverless Functions
│   ├── auth/login.ts             # Login/signup (auto-create user)
│   ├── clues/
│   │   ├── index.ts              # GET/POST clues
│   │   ├── random.ts             # Random unsolved clue for guessing
│   │   └── [id].ts               # Clue by ID (with optional reveal/stats)
│   ├── results/index.ts          # Save/get guess results
│   ├── ratings/index.ts          # Save/get clue ratings + reports
│   ├── leaderboard/index.ts      # Leaderboard rankings
│   ├── users/[userId]/stats.ts   # Per-user statistics
│   ├── admin/index.ts            # Admin CRUD (clues, users, results, reports)
│   └── db/init.ts                # DB schema init + migrations
│
├── src/
│   ├── main.tsx                  # Entry: AuthProvider → ProfileModalProvider → App
│   ├── App.tsx                   # Router: ProfileModal + Routes
│   ├── index.css                 # Tailwind directives + global styles
│   │
│   ├── pages/                    # Route pages
│   │   ├── LoginPage.tsx         # /login
│   │   ├── HomePage.tsx          # / (stats + start game)
│   │   ├── SetupPage.tsx         # /setup (mode/size/ranked selection)
│   │   ├── ClueGivingPage.tsx    # /give-clue/:seed (spymaster)
│   │   ├── GuessingPage.tsx      # /guess/:clueId (guesser)
│   │   ├── ResultsPage.tsx       # /results/:clueId
│   │   ├── LeaderboardPage.tsx   # /leaderboard (3 tabs)
│   │   ├── ProfilePage.tsx       # /profile/:userId?
│   │   └── AdminPage.tsx         # /admin (clues/users/results tabs)
│   │
│   ├── components/
│   │   ├── board/
│   │   │   ├── Board.tsx         # Grid of cards (4x4/5x5), drag-drop support
│   │   │   └── Card.tsx          # Single card with reveal animation
│   │   ├── clue/
│   │   │   ├── ClueInput.tsx     # Word + number form (spymaster)
│   │   │   └── ClueDisplay.tsx   # Shows clue during guessing
│   │   ├── game/
│   │   │   ├── GameHeader.tsx    # Title + config display
│   │   │   ├── RevealOverlay.tsx # Post-game reveal summary
│   │   │   ├── ClueRating.tsx    # 1-5 star rating + report UI
│   │   │   ├── ClueStatsPanel.tsx # Attempt stats + details
│   │   │   └── BoardReviewModal.tsx # Review board (z-[60] nested modal)
│   │   ├── layout/
│   │   │   └── NavBar.tsx        # Top navigation bar
│   │   ├── profile/
│   │   │   ├── ProfileContent.tsx # Profile UI (given/solved tabs, accordion rows)
│   │   │   └── ProfileModal.tsx  # App-wide profile modal (z-50)
│   │   ├── settings/
│   │   │   └── SettingsPanel.tsx  # User preferences UI
│   │   └── shared/               # Reusable UI components
│   │
│   ├── context/
│   │   ├── AuthContext.tsx        # Login/logout, user state, localStorage
│   │   ├── GameContext.tsx        # useReducer game state machine
│   │   └── ProfileModalContext.tsx # openProfile/closeProfile modal
│   │
│   ├── hooks/
│   │   └── useDragReorder.ts     # Drag-and-drop reordering
│   │
│   ├── i18n/
│   │   ├── I18nContext.tsx        # Provider (fixed to Russian)
│   │   ├── ru.ts                 # Russian translations + TranslationKeys type
│   │   └── useTranslation.ts     # Hook: returns `t` object
│   │
│   ├── lib/
│   │   ├── api.ts                # Fetch wrapper + all API endpoints
│   │   ├── boardGenerator.ts     # Deterministic board from seed
│   │   ├── clueValidator.ts      # Clue word/number validation
│   │   ├── scoring.ts            # Score computation
│   │   ├── seededRandom.ts       # Deterministic RNG (hash + LCG)
│   │   └── seedPersistence.ts    # localStorage helpers
│   │
│   ├── types/
│   │   ├── game.ts               # CardColor, BoardState, Clue, GuessResult, etc.
│   │   └── user.ts               # User, UserPreferences, UserStats
│   │
│   └── data/
│       └── words-ru.ts           # Russian word list for boards
│
├── public/                       # Static assets served at root
├── vercel.json                   # SPA rewrite: non-API → index.html
├── tailwind.config.js            # Custom board-* colors, fonts, animations
├── vite.config.ts                # Vite config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies
```

## Routes

| Path | Page | Auth | Description |
|------|------|------|-------------|
| `/login` | LoginPage | No | Username + optional password |
| `/` | HomePage | Yes | Stats + start game button |
| `/setup` | SetupPage | Yes | Mode, size, ranked/casual |
| `/give-clue/:seed` | ClueGivingPage | Yes | Spymaster gives clues |
| `/guess/:clueId` | GuessingPage | Yes | Guesser solves puzzle |
| `/results/:clueId` | ResultsPage | Yes | Game results |
| `/leaderboard` | LeaderboardPage | Yes | Rankings: spymasters, guessers, clues |
| `/profile/:userId?` | ProfilePage | Yes | User stats + history |
| `/admin` | AdminPage | Yes | Admin: clues, users, results tabs |

All routes except `/login` wrapped in `RequireAuth` (redirects to `/login`).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login/signup (auto-create) |
| GET | `/api/clues?userId=` | User's clues |
| POST | `/api/clues` | Save new clue |
| GET | `/api/clues/random?userId=&...` | Random unsolved clue |
| GET | `/api/clues/[id]?reveal=&stats=` | Clue details/stats |
| GET | `/api/results?userId=` | User's results |
| POST | `/api/results` | Save guess result (score computed server-side) |
| GET/POST | `/api/ratings` | Get/save clue rating |
| GET | `/api/leaderboard?boardSize=` | Rankings |
| GET | `/api/users/[userId]/stats` | User stats |
| GET/DELETE | `/api/admin?action=&adminId=` | Admin operations |
| GET | `/api/db/init` | Initialize/migrate DB schema |

## State Management

### AuthContext
- `user: User | null`, `login()`, `logout()`, `updateUser()`
- Persists to localStorage: `codenames_current_user`, `codenames_cached_user`

### GameContext (useReducer)
- Actions: `INIT_BOARD`, `SET_CLUE`, `TOGGLE_GUESS`, `TOGGLE_TARGET`, `FINISH`, `REVEAL_ALL`, `RESET`
- State: `mode`, `board`, `currentClue`, `guessedIndices`, `selectedTargets`, `phase`

### ProfileModalContext
- `profileUserId`, `openProfile(userId)`, `closeProfile()`
- Used across components to open profiles without navigation

### I18nContext
- Fixed Russian locale, `useTranslation()` returns `t` object
- All strings in `src/i18n/ru.ts`

## Key Patterns

### Board Generation
Deterministic: `seed → hashString → createSeededRandom → Fisher-Yates shuffle`.
Same seed always produces identical board. Supports 4x4 (16 cards) and 5x5 (25 cards).

### Security
- `targetIndices` NOT sent to guesser initially (prevents cheating)
- Only revealed after `POST /api/results` returns them
- Score computed server-side
- Admin endpoints verify `is_admin` flag server-side

### Game Persistence
- Active guess stored in localStorage (`codenames_active_guess`)
- Allows resuming interrupted games
- Completed guess cached for back-navigation

### Clue-0 Mode
- Spymaster selects non-red cards as "nulls" → `number=0`
- Guesser sees "?" instead of count, no auto-end
- Used to warn teammates away from dangerous words

### Accordion Pattern (Tables)
- Profile given/solved tabs, leaderboard clues tab, admin users tab
- Click row → expand with details + action buttons
- Delete (×) opens accordion with inline confirmation instead of modal

### Z-Index Stacking
- ProfileModal: `z-50`
- BoardReviewModal: `z-[60]` (opens on top of profile modal)

## Tailwind Theme Colors
- `board-bg`: #121218 (dark background)
- `board-card`: #8a8a78 (card default)
- `board-red`: #EF5350 (red team)
- `board-blue`: #42A5F5 (blue team)
- `board-neutral`: #b0b0b0
- `board-assassin`: #3a3a3a

## User Preferences
```typescript
interface UserPreferences {
  defaultBoardSize: '4x4' | '5x5'
  animationEnabled: boolean
  revealDuration: number        // ms per card reveal
  cardFontSize: 'sm' | 'md' | 'lg'
  colorSortMode: 'rows' | 'columns'
}
```
