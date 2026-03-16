# Codenames Online

A multiplayer web adaptation of the board game **Codenames**, built with React and deployed on Vercel. Players take turns as spymasters (giving clues) and guessers (finding target words on the board). Features ranked/casual modes, leaderboards, user profiles, and a full admin panel.

**Live:** [codenames-lyart.vercel.app](https://codenames-lyart.vercel.app)

## Features

- **Two roles** — Spymaster gives word+number clues; Guesser picks cards on the board
- **Board sizes** — 4×4 (16 cards) and 5×5 (25 cards)
- **Ranked & Casual modes** — Ranked affects leaderboard standings; Casual allows custom color counts
- **Clue-0 mode** — Spymaster marks dangerous cards to warn teammates away
- **Deterministic boards** — Seed-based generation ensures identical boards for all players
- **Anti-cheat** — Target cards are hidden from guessers until results are submitted; scoring is server-side
- **Leaderboards** — Rankings for top spymasters, guessers, and best clues
- **User profiles** — Stats, game history, clue ratings
- **Interactive tutorial** — Step-by-step walkthrough for new players
- **OAuth login** — Optional account linking
- **Admin panel** — Manage clues, users, results, and reports
- **Russian UI** — All interface text in Russian

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Styling | Tailwind CSS 3.4 |
| Routing | React Router v7 |
| Backend | Vercel Serverless Functions (TypeScript) |
| Database | Neon PostgreSQL (serverless) |
| Icons | Heroicons React |
| Deployment | Vercel (auto-deploy on push) |

## Project Structure

```
codenames/
├── api/                    # Vercel Serverless Functions (backend)
│   ├── auth/               # Login, OAuth
│   ├── game/               # Clue CRUD, guessing, random clue
│   ├── leaderboard/        # Rankings
│   ├── social/             # Profiles, ratings, comments
│   ├── admin/              # Admin operations
│   └── feedback/           # User feedback
│
├── src/
│   ├── pages/              # Route pages (Login, Home, Setup, ClueGiving, Guessing, Results, etc.)
│   ├── components/         # UI components (board/, clue/, game/, layout/, profile/, settings/, shared/)
│   ├── context/            # React contexts (Auth, Game state machine, ProfileModal)
│   ├── hooks/              # Custom hooks (drag-and-drop)
│   ├── i18n/               # Internationalization (Russian)
│   ├── lib/                # Utilities (API client, board generator, scoring, validation)
│   ├── types/              # TypeScript type definitions
│   ├── data/               # Word lists (Russian, English)
│   └── tutorial/           # Tutorial scenarios and state machine
│
├── public/                 # Static assets
├── schema.sql              # Database schema reference
├── vercel.json             # Vercel config (SPA rewrites, cron jobs)
├── tailwind.config.js      # Custom theme (board colors, animations)
├── vite.config.ts          # Vite bundler config
└── package.json            # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Vercel](https://vercel.com) account (for deployment)

### Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/<your-username>/codenames.git
   cd codenames
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
   ```

4. **Initialize the database**

   Deploy to Vercel first (or use `vercel dev`), then visit:
   ```
   /api/admin?action=init
   ```
   This creates all tables and runs migrations.

5. **Start the dev server**
   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:5173`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

## Deployment

Push to `master` → Vercel auto-deploys. No additional CI/CD configuration needed.

The Vercel project must have the `DATABASE_URL` environment variable set to your Neon connection string.

## Database

The app uses 6 tables: `users`, `clues`, `results`, `ratings`, `reports`, and `oauth_accounts`. See [schema.sql](schema.sql) for the full schema.

Key constraints:
- Users can't guess their own clues
- One guess attempt per clue per user
- Scores are computed server-side to prevent cheating

## API

All API endpoints live under `/api/` and are deployed as Vercel Serverless Functions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login or auto-create account |
| GET/POST | `/api/game` | Clue operations (create, get, random) |
| GET | `/api/leaderboard` | Rankings by board size |
| GET/POST | `/api/social` | Profiles, ratings, comments |
| GET/DELETE | `/api/admin` | Admin CRUD operations |
| GET | `/api/admin?action=init` | Initialize/migrate database |

## License

This project is not currently licensed for redistribution. All rights reserved.
