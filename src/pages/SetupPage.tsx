import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { generateSeed } from '../lib/boardGenerator';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { BOARD_CONFIGS } from '../types/game';
import type { BoardSize, GameMode } from '../types/game';

const COLOR_CONFIG = [
  { key: 'red' as const, bg: 'bg-board-red' },
  { key: 'blue' as const, bg: 'bg-board-blue' },
  { key: 'neutral' as const, bg: 'bg-board-neutral' },
  { key: 'assassin' as const, bg: 'bg-board-assassin border border-gray-600' },
];

const MODE_CONFIG = {
  'clue-giving': {
    border: 'border-board-red',
    borderBack: 'border-board-blue/40',
    titleKey: 'clueing' as const,
    descKey: 'clueingDesc' as const,
    accent: 'text-board-red',
  },
  guessing: {
    border: 'border-board-blue',
    borderBack: 'border-board-red/40',
    titleKey: 'guessing' as const,
    descKey: 'guessingDesc' as const,
    accent: 'text-board-blue',
  },
};

export default function SetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<GameMode>('clue-giving');
  const [ranked, setRanked] = useState(true);
  const boardSize: BoardSize = '5x5';
  const [loading, setLoading] = useState(false);
  const [puzzleCount, setPuzzleCount] = useState<{ available: number; total: number } | null>(null);
  const [animating, setAnimating] = useState(false);

  const defaults = BOARD_CONFIGS[boardSize];
  const [redCount, setRedCount] = useState(defaults.redCount);
  const [blueCount, setBlueCount] = useState(defaults.blueCount);
  const [assassinCount, setAssassinCount] = useState(defaults.assassinCount);

  const totalCards = defaults.totalCards;
  const neutralCount = totalCards - redCount - blueCount - assassinCount;

  // When switching to ranked, reset to defaults
  useEffect(() => {
    if (ranked) {
      const cfg = BOARD_CONFIGS[boardSize];
      setRedCount(cfg.redCount);
      setBlueCount(cfg.blueCount);
      setAssassinCount(cfg.assassinCount);
    }
  }, [ranked, boardSize]);

  useEffect(() => {
    if (!user || mode !== 'guessing') {
      setPuzzleCount(null);
      return;
    }
    api.getClueCount(user.id, 'ru', boardSize).then(setPuzzleCount).catch(() => setPuzzleCount(null));
  }, [user, mode, boardSize]);

  function canAdjust(key: string, delta: number): boolean {
    if (ranked) return false;
    if (key === 'red') {
      const newVal = redCount + delta;
      if (newVal < 1) return false;
      return totalCards - newVal - blueCount - assassinCount >= 0;
    }
    if (key === 'blue') {
      const newVal = blueCount + delta;
      if (newVal < 1) return false;
      return totalCards - redCount - newVal - assassinCount >= 0;
    }
    if (key === 'assassin') {
      const newVal = assassinCount + delta;
      if (newVal < 0) return false;
      return totalCards - redCount - blueCount - newVal >= 0;
    }
    return false;
  }

  function adjust(key: string, delta: number) {
    if (!canAdjust(key, delta)) return;
    if (key === 'red') setRedCount((v) => v + delta);
    if (key === 'blue') setBlueCount((v) => v + delta);
    if (key === 'assassin') setAssassinCount((v) => v + delta);
  }

  function resetConfig() {
    const cfg = BOARD_CONFIGS[boardSize];
    setRedCount(cfg.redCount);
    setBlueCount(cfg.blueCount);
    setAssassinCount(cfg.assassinCount);
  }

  const counts: Record<string, number> = {
    red: redCount,
    blue: blueCount,
    neutral: neutralCount,
    assassin: assassinCount,
  };

  function handleModeSwitch() {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setMode((m) => (m === 'clue-giving' ? 'guessing' : 'clue-giving'));
      setAnimating(false);
    }, 300);
  }

  async function handleStart() {
    if (!user) return;

    if (mode === 'clue-giving') {
      const seed = generateSeed();
      const params = new URLSearchParams({ size: boardSize });
      if (redCount !== defaults.redCount || blueCount !== defaults.blueCount || assassinCount !== defaults.assassinCount) {
        params.set('r', String(redCount));
        params.set('b', String(blueCount));
        params.set('a', String(assassinCount));
      }
      navigate(`/give-clue/${encodeURIComponent(seed)}?${params}`);
    } else {
      setLoading(true);
      try {
        const clue = await api.getRandomClue(user.id, [], 'ru', boardSize);
        if (clue) {
          navigate(`/guess/${clue.id}`);
        } else {
          alert(t.game.noClues);
        }
      } catch {
        alert('Failed to load clue. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  }

  const current = MODE_CONFIG[mode];
  const otherMode: GameMode = mode === 'clue-giving' ? 'guessing' : 'clue-giving';
  const other = MODE_CONFIG[otherMode];

  return (
    <div className="min-h-screen">
      <NavBar showBack />
      <div className="max-w-lg mx-auto px-4 pt-10">
        <h1 className="text-2xl font-extrabold text-white mb-8 text-center">{t.setup.title}</h1>

        {/* Mode selector — stacked cards */}
        <div className="relative mb-6 mx-auto" style={{ maxWidth: '320px' }}>
          {/* Back card (other mode) */}
          <div
            onClick={handleModeSwitch}
            className={`absolute inset-0 translate-x-2 translate-y-2 rounded-xl border-2 ${other.border} bg-gray-900/40 cursor-pointer transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-60'}`}
          />

          {/* Front card (selected mode) */}
          <div
            onClick={handleModeSwitch}
            className={`relative rounded-xl border-2 ${current.border} bg-gray-900/80 backdrop-blur-sm p-5 cursor-pointer transition-all duration-300 ${animating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
          >
            <h2 className={`text-lg font-extrabold ${current.accent} mb-1`}>
              {t.setup[current.titleKey]}
            </h2>
            <p className="text-gray-400 text-sm leading-snug">
              {t.setup[current.descKey]}
            </p>
          </div>
        </div>

        {/* Ranked toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setRanked(true)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              ranked ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.setup.ranked}
          </button>
          <button
            onClick={() => setRanked(false)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              !ranked ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.setup.casual}
          </button>
        </div>

        {/* Color Config — only for clue-giving mode */}
        {mode === 'clue-giving' && (
          <div className="mb-8">
            <div className="flex items-center gap-3 justify-center">
              <div className="flex items-center gap-2">
                {COLOR_CONFIG.map(({ key, bg }) => {
                  const count = counts[key];
                  const isNeutral = key === 'neutral';
                  const adjustable = !isNeutral && !ranked;
                  return (
                    <div key={key} className="flex flex-col items-center gap-0.5">
                      {adjustable ? (
                        <button
                          onClick={() => adjust(key, 1)}
                          disabled={!canAdjust(key, 1)}
                          className="text-gray-400 hover:text-white disabled:opacity-20 text-xs leading-none"
                        >
                          ▲
                        </button>
                      ) : (
                        <span className="text-xs text-transparent leading-none select-none">▲</span>
                      )}
                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-md ${bg} flex items-center justify-center text-white font-bold text-lg ${ranked ? 'opacity-60' : ''}`}
                      >
                        {count}
                      </div>
                      {adjustable ? (
                        <button
                          onClick={() => adjust(key, -1)}
                          disabled={!canAdjust(key, -1)}
                          className="text-gray-400 hover:text-white disabled:opacity-20 text-xs leading-none"
                        >
                          ▼
                        </button>
                      ) : (
                        <span className="text-xs text-transparent leading-none select-none">▼</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {!ranked && (
                <button
                  onClick={resetConfig}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  title={t.setup.resetConfig}
                >
                  <ArrowUturnLeftIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading || (mode === 'guessing' && puzzleCount?.available === 0)}
          className="w-full py-4 rounded-xl bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors disabled:opacity-50"
        >
          {loading ? t.game.findingClue : t.setup.start}
        </button>

        {/* Puzzle count — below button so layout doesn't shift */}
        {mode === 'guessing' && puzzleCount && (
          <p className={`text-center text-sm mt-3 ${puzzleCount.available > 0 ? 'text-gray-400' : 'text-board-red'}`}>
            {puzzleCount.available > 0
              ? t.setup.availablePuzzles.replace('{available}', String(puzzleCount.available)).replace('{total}', String(puzzleCount.total))
              : t.setup.noPuzzlesAvailable}
          </p>
        )}
      </div>
    </div>
  );
}
