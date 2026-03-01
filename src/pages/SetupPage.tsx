import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { generateSeed } from '../lib/boardGenerator';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import { BOARD_CONFIGS } from '../types/game';
import type { BoardSize, GameMode } from '../types/game';

const COLOR_CONFIG = [
  { key: 'red' as const, bg: 'bg-board-red' },
  { key: 'blue' as const, bg: 'bg-board-blue' },
  { key: 'neutral' as const, bg: 'bg-board-neutral' },
  { key: 'assassin' as const, bg: 'bg-board-assassin border border-gray-600' },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<GameMode>('clue-giving');
  const [boardSize, setBoardSize] = useState<BoardSize>(user?.preferences.defaultBoardSize ?? '5x5');
  const [loading, setLoading] = useState(false);
  const [puzzleCount, setPuzzleCount] = useState<{ available: number; total: number } | null>(null);

  const defaults = BOARD_CONFIGS[boardSize];
  const [redCount, setRedCount] = useState(defaults.redCount);
  const [blueCount, setBlueCount] = useState(defaults.blueCount);
  const [assassinCount, setAssassinCount] = useState(defaults.assassinCount);

  const totalCards = defaults.totalCards;
  const neutralCount = totalCards - redCount - blueCount - assassinCount;

  useEffect(() => {
    const cfg = BOARD_CONFIGS[boardSize];
    setRedCount(cfg.redCount);
    setBlueCount(cfg.blueCount);
    setAssassinCount(cfg.assassinCount);
  }, [boardSize]);

  useEffect(() => {
    if (!user || mode !== 'guessing') {
      setPuzzleCount(null);
      return;
    }
    api.getClueCount(user.id, 'ru', boardSize).then(setPuzzleCount).catch(() => setPuzzleCount(null));
  }, [user, mode, boardSize]);

  function canAdjust(key: string, delta: number): boolean {
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

  function toggleSize() {
    setBoardSize((s) => (s === '5x5' ? '4x4' : '5x5'));
  }

  const counts: Record<string, number> = {
    red: redCount,
    blue: blueCount,
    neutral: neutralCount,
    assassin: assassinCount,
  };

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

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-10">
        <h1 className="text-2xl font-extrabold text-white mb-8 text-center">{t.setup.title}</h1>

        {/* Mode */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">{t.setup.mode}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('clue-giving')}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                mode === 'clue-giving'
                  ? 'border-board-blue/60 bg-board-blue/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <p className="font-bold text-white">{t.setup.clueing}</p>
              <p className="text-xs text-gray-400 mt-1">{t.setup.clueingDesc}</p>
            </button>
            <button
              onClick={() => setMode('guessing')}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                mode === 'guessing'
                  ? 'border-board-blue/60 bg-board-blue/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <p className="font-bold text-white">{t.setup.guessing}</p>
              <p className="text-xs text-gray-400 mt-1">{t.setup.guessingDesc}</p>
            </button>
          </div>
        </div>

        {/* Board Size + Color Config */}
        <div className="mb-8">
          <label className="block text-sm text-gray-400 mb-2">{t.setup.boardSize}</label>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSize}
              className="px-4 py-3 rounded-lg border-2 border-board-blue/60 bg-board-blue/10 text-white font-bold text-lg min-w-[4.5rem] text-center transition-colors hover:bg-board-blue/20"
            >
              {boardSize === '5x5' ? '5×5' : '4×4'}
            </button>

            <div className="flex items-center gap-2 flex-1">
              {COLOR_CONFIG.map(({ key, bg }) => {
                const count = counts[key];
                const isNeutral = key === 'neutral';
                return (
                  <div key={key} className="flex flex-col items-center gap-0.5">
                    {!isNeutral ? (
                      <button
                        onClick={() => adjust(key, 1)}
                        disabled={!canAdjust(key, 1)}
                        className="text-gray-400 hover:text-white disabled:opacity-20 text-xs leading-none"
                      >
                        ▲
                      </button>
                    ) : (
                      <span className="text-xs text-transparent leading-none">▲</span>
                    )}
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-md ${bg} flex items-center justify-center text-white font-bold text-lg`}
                    >
                      {count}
                    </div>
                    {!isNeutral ? (
                      <button
                        onClick={() => adjust(key, -1)}
                        disabled={!canAdjust(key, -1)}
                        className="text-gray-400 hover:text-white disabled:opacity-20 text-xs leading-none"
                      >
                        ▼
                      </button>
                    ) : (
                      <span className="text-xs text-transparent leading-none">▼</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={resetConfig}
              className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors"
            >
              {t.setup.resetConfig}
            </button>
          </div>
        </div>

        {/* Puzzle count */}
        {mode === 'guessing' && puzzleCount && (
          <p className={`text-center text-sm mb-4 ${puzzleCount.available > 0 ? 'text-gray-400' : 'text-board-red'}`}>
            {puzzleCount.available > 0
              ? t.setup.availablePuzzles.replace('{available}', String(puzzleCount.available)).replace('{total}', String(puzzleCount.total))
              : t.setup.noPuzzlesAvailable}
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={loading || (mode === 'guessing' && puzzleCount?.available === 0)}
          className="w-full py-4 rounded-xl bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors disabled:opacity-50"
        >
          {loading ? t.game.findingClue : t.setup.start}
        </button>
      </div>
    </div>
  );
}
