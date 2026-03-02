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
    titleKey: 'clueing' as const,
    descKey: 'clueingDesc' as const,
    accent: 'text-board-red',
  },
  guessing: {
    border: 'border-board-blue',
    titleKey: 'guessing' as const,
    descKey: 'guessingDesc' as const,
    accent: 'text-board-blue',
  },
};

const RANKED_CONFIG = {
  true: {
    border: 'border-amber-500',
    titleKey: 'ranked' as const,
    descKey: 'rankedDesc' as const,
    accent: 'text-amber-400',
  },
  false: {
    border: 'border-gray-500',
    titleKey: 'casual' as const,
    descKey: 'casualDesc' as const,
    accent: 'text-gray-300',
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
  const [modeAnim, setModeAnim] = useState(false);
  const [rankedAnim, setRankedAnim] = useState(false);
  const [continueGameId, setContinueGameId] = useState<string | null>(null);

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
    api.getClueCount(user.id, 'ru', boardSize, ranked).then(setPuzzleCount).catch(() => setPuzzleCount(null));
  }, [user, mode, boardSize, ranked]);

  function canAdjust(key: string, delta: number): boolean {
    if (ranked || mode === 'guessing') return false;
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
    if (modeAnim) return;
    setModeAnim(true);
    setTimeout(() => {
      setMode((m) => (m === 'clue-giving' ? 'guessing' : 'clue-giving'));
      setModeAnim(false);
    }, 300);
  }

  function handleRankedSwitch() {
    if (rankedAnim) return;
    setRankedAnim(true);
    setTimeout(() => {
      setRanked((r) => !r);
      setRankedAnim(false);
    }, 300);
  }

  async function startGuessing() {
    if (!user) return;
    setLoading(true);
    try {
      const clue = await api.getRandomClue(user.id, [], 'ru', boardSize, ranked);
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

  async function handleStart() {
    if (!user) return;

    if (mode === 'clue-giving') {
      const seed = generateSeed();
      const params = new URLSearchParams({ size: boardSize });
      if (!ranked) {
        params.set('ranked', '0');
        if (redCount !== defaults.redCount || blueCount !== defaults.blueCount || assassinCount !== defaults.assassinCount) {
          params.set('r', String(redCount));
          params.set('b', String(blueCount));
          params.set('a', String(assassinCount));
        }
      }
      navigate(`/give-clue/${encodeURIComponent(seed)}?${params}`);
    } else {
      // Check for unfinished game
      const saved = localStorage.getItem('codenames_active_guess');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.pickedIndices?.length > 0) {
            setContinueGameId(state.clueId);
            return;
          }
        } catch { /* ignore */ }
      }
      await startGuessing();
    }
  }

  const currentMode = MODE_CONFIG[mode];
  const otherMode = MODE_CONFIG[mode === 'clue-giving' ? 'guessing' : 'clue-giving'];
  const currentRanked = RANKED_CONFIG[String(ranked) as 'true' | 'false'];
  const otherRanked = RANKED_CONFIG[String(!ranked) as 'true' | 'false'];

  const colorLocked = ranked || mode === 'guessing';
  const showQuestionMarks = mode === 'guessing' && !ranked;

  return (
    <div className="min-h-screen">
      <NavBar showBack />
      <div className="max-w-lg mx-auto px-4 pt-10">
        <h1 className="text-2xl font-extrabold text-white mb-8 text-center">{t.setup.title}</h1>

        {/* Two card selectors side by side */}
        <div className="flex gap-4 mb-6 mx-auto" style={{ maxWidth: '400px' }}>
          {/* Mode selector — stacked cards */}
          <div className="relative flex-1 min-h-[80px]">
            <div
              onClick={handleModeSwitch}
              className={`absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl border-2 ${otherMode.border} bg-gray-900/40 cursor-pointer transition-all duration-300 ${modeAnim ? 'opacity-0 scale-95' : 'opacity-60'}`}
            />
            <div
              onClick={handleModeSwitch}
              className={`relative rounded-xl border-2 ${currentMode.border} bg-gray-900/80 backdrop-blur-sm p-4 cursor-pointer transition-all duration-300 ${modeAnim ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
            >
              <h2 className={`text-base font-extrabold ${currentMode.accent} mb-0.5`}>
                {t.setup[currentMode.titleKey]}
              </h2>
              <p className="text-gray-400 text-xs leading-snug">
                {t.setup[currentMode.descKey]}
              </p>
            </div>
          </div>

          {/* Ranked selector — stacked cards */}
          <div className="relative flex-1 min-h-[80px]">
            <div
              onClick={handleRankedSwitch}
              className={`absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl border-2 ${otherRanked.border} bg-gray-900/40 cursor-pointer transition-all duration-300 ${rankedAnim ? 'opacity-0 scale-95' : 'opacity-60'}`}
            />
            <div
              onClick={handleRankedSwitch}
              className={`relative rounded-xl border-2 ${currentRanked.border} bg-gray-900/80 backdrop-blur-sm p-4 cursor-pointer transition-all duration-300 ${rankedAnim ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
            >
              <h2 className={`text-base font-extrabold ${currentRanked.accent} mb-0.5`}>
                {t.setup[currentRanked.titleKey]}
              </h2>
              <p className="text-gray-400 text-xs leading-snug">
                {t.setup[currentRanked.descKey]}
              </p>
            </div>
          </div>
        </div>

        {/* Color Config — always visible */}
        <div className="mb-8">
          <div className="flex items-center gap-3 justify-center">
            <div className="flex items-center gap-2">
              {COLOR_CONFIG.map(({ key, bg }) => {
                const count = counts[key];
                const isNeutral = key === 'neutral';
                const adjustable = !isNeutral && !colorLocked;
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
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-md ${bg} flex items-center justify-center text-white font-bold text-lg ${colorLocked ? 'opacity-60' : ''}`}
                    >
                      {showQuestionMarks ? '?' : count}
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

            {!colorLocked && (
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

        {continueGameId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setContinueGameId(null)}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
              <p className="text-white mb-4">{t.setup.unfinishedGame}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    navigate(`/guess/${continueGameId}`);
                    setContinueGameId(null);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-board-blue hover:bg-blue-600 rounded-lg transition-colors"
                >
                  {t.setup.continueGame}
                </button>
                <button
                  onClick={() => setContinueGameId(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {t.rating.cancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
