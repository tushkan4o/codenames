import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
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

const MODE_OPTIONS = [
  { value: 'clue-giving' as GameMode, titleKey: 'clueing' as const, descKey: 'clueingDesc' as const, bg: 'bg-board-red' },
  { value: 'guessing' as GameMode, titleKey: 'guessing' as const, descKey: 'guessingDesc' as const, bg: 'bg-board-blue' },
];


export default function SetupPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<GameMode>(() => {
    const saved = localStorage.getItem('codenames_setup_mode');
    return saved === 'clue-giving' || saved === 'guessing' ? saved : 'clue-giving';
  });
  const [ranked, setRanked] = useState(() => {
    const saved = localStorage.getItem('codenames_setup_ranked');
    return saved === null ? false : saved === 'true';
  });
  const boardSize: BoardSize = '5x5';
  const [loading, setLoading] = useState(false);
  const [puzzleCount, setPuzzleCount] = useState<{ available: number; total: number } | null>(null);
  const [continueGameId, setContinueGameId] = useState<string | null>(null);

  const defaults = BOARD_CONFIGS[boardSize];
  const [redCount, setRedCount] = useState(defaults.redCount);
  const [blueCount, setBlueCount] = useState(defaults.blueCount);
  const [assassinCount, setAssassinCount] = useState(defaults.assassinCount);

  const totalCards = defaults.totalCards;
  const neutralCount = totalCards - redCount - blueCount - assassinCount;

  // Refresh casual stats on mount
  useEffect(() => { refreshUser(); }, []);

  // Persist setup preferences
  useEffect(() => { localStorage.setItem('codenames_setup_mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('codenames_setup_ranked', String(ranked)); }, [ranked]);

  // Force casual if user can't play ranked
  const hasOAuth = !!user?.hasOAuth;
  const hasGames = (user?.casualCluesGiven ?? 0) >= 1 && (user?.casualCluesSolved ?? 0) >= 5;
  const canRanked = hasOAuth && hasGames;
  const [rankedLockMsg, setRankedLockMsg] = useState('');
  const [rankedBounce, setRankedBounce] = useState(false);

  function buildRankedLockMsg(): string {
    if (hasOAuth && hasGames) return '';
    if (!hasOAuth && hasGames) {
      return 'Для игры в рейтинговом режиме необходима привязка профиля к Google или Discord';
    }
    const needClues = Math.max(0, 1 - (user?.casualCluesGiven ?? 0));
    const needSolves = Math.max(0, 5 - (user?.casualCluesSolved ?? 0));
    const parts: string[] = [];
    if (needClues > 0) parts.push(`${needClues} за капитана`);
    if (needSolves > 0) parts.push(`${needSolves} за разведчика`);
    const remaining = parts.length > 0 ? ` (осталось ${parts.join(' и ')})` : '';
    if (!hasOAuth) {
      return `Для игры в рейтинговом режиме необходима привязка профиля к Google или Discord, а также 1 игра за капитана и 5 за разведчика в обычном режиме${remaining}`;
    }
    return `Для игры в рейтинговом режиме необходима 1 игра за капитана и 5 за разведчика в обычном режиме${remaining}`;
  }
  useEffect(() => {
    if (ranked && !canRanked) setRanked(false);
  }, [canRanked]);

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
      const params = new URLSearchParams({ size: boardSize });
      if (!ranked) {
        params.set('ranked', '0');
        if (redCount !== defaults.redCount || blueCount !== defaults.blueCount || assassinCount !== defaults.assassinCount) {
          params.set('r', String(redCount));
          params.set('b', String(blueCount));
          params.set('a', String(assassinCount));
        }
      }
      // Start captain game on server (sets active mode + creates game if needed)
      await api.startCaptainGame(user.id, ranked, params.toString());
      navigate('/give-clue');
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

  const colorLocked = ranked || mode === 'guessing';
  const showQuestionMarks = mode === 'guessing' && !ranked;

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-10 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-10 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-2xl font-extrabold text-white mb-8 text-center">{t.setup.title}</h1>

        {/* Mode toggle */}
        <div className="flex gap-3 sm:gap-4 mb-6 mx-auto flex-col" style={{ maxWidth: '400px' }}>
          <p className="text-xs font-semibold text-gray-500 uppercase text-center">{t.setup.mode}</p>
          <button
            onClick={() => setMode(mode === 'clue-giving' ? 'guessing' : 'clue-giving')}
            className="relative flex bg-gray-800/80 rounded-xl p-1 border border-gray-700/30 w-full cursor-pointer"
          >
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg transition-all duration-300 ease-out ${
                mode === 'clue-giving' ? 'left-1 bg-board-red' : 'left-[calc(50%+0.25rem)] bg-board-blue'
              }`}
            />
            {MODE_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className="relative z-10 flex-1 py-2.5 px-3 text-center rounded-lg transition-colors duration-300"
              >
                <span className={`text-sm font-bold block ${mode === opt.value ? 'text-white' : 'text-gray-500'}`}>
                  {t.setup[opt.titleKey]}
                </span>
                <span className={`text-[0.6rem] sm:text-xs block mt-0.5 transition-colors duration-300 ${mode === opt.value ? 'text-white/70' : 'text-gray-600'}`}>
                  {t.setup[opt.descKey]}
                </span>
              </div>
            ))}
          </button>

          {/* Ranked toggle — casual left, ranked right */}
          <button
            onClick={() => {
              if (ranked) {
                setRanked(false);
                setRankedLockMsg('');
              } else if (canRanked) {
                setRanked(true);
                setRankedLockMsg('');
              } else {
                setRankedBounce(true);
                setRankedLockMsg(buildRankedLockMsg());
                setTimeout(() => setRankedBounce(false), 200);
              }
            }}
            className="relative flex bg-gray-800/80 rounded-xl p-1 border border-gray-700/30 w-full cursor-pointer"
          >
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg transition-all ease-out ${
                rankedBounce ? 'left-[calc(10%)] bg-gray-600 duration-150' :
                ranked && canRanked ? 'left-[calc(50%+0.25rem)] bg-amber-600 duration-300' : 'left-1 bg-gray-600 duration-200'
              }`}
            />
            <div className="relative z-10 flex-1 py-2.5 px-3 text-center rounded-lg transition-colors duration-300">
              <span className={`text-sm font-bold block ${!ranked || !canRanked ? 'text-white' : 'text-gray-500'}`}>
                {t.setup.casual}
              </span>
              <span className={`text-[0.6rem] sm:text-xs block mt-0.5 transition-colors duration-300 ${!ranked || !canRanked ? 'text-white/70' : 'text-gray-600'}`}>
                {t.setup.casualDesc}
              </span>
            </div>
            <div className={`relative z-10 flex-1 py-2.5 px-3 text-center rounded-lg transition-colors duration-300 ${!canRanked ? 'opacity-50' : ''}`}>
              <span className={`text-sm font-bold block ${ranked && canRanked ? 'text-white' : 'text-gray-500'}`}>
                ★ {t.setup.ranked} ★
              </span>
              <span className={`text-[0.6rem] sm:text-xs block mt-0.5 transition-colors duration-300 ${ranked && canRanked ? 'text-white/70' : 'text-gray-600'}`}>
                {t.setup.rankedDesc}
              </span>
            </div>
          </button>
          {rankedLockMsg && (
            <p className="text-xs text-amber-500/70 text-center mt-1">{rankedLockMsg}</p>
          )}
        </div>

        {/* Color Config — always visible */}
        <p className="text-xs font-semibold text-gray-500 uppercase text-center mb-3">{t.setup.boardConfig}</p>
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
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-md ${bg} flex items-center justify-center text-white font-bold text-lg`}
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

            <button
              onClick={resetConfig}
              disabled={colorLocked}
              className={`p-2 rounded-lg transition-colors ${colorLocked ? 'text-transparent cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              title={t.setup.resetConfig}
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mx-auto" style={{ maxWidth: '400px' }}>
          <button
            onClick={handleStart}
            disabled={loading || (mode === 'guessing' && puzzleCount?.available === 0)}
            className="w-full py-4 rounded-xl bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors disabled:opacity-50"
          >
            {loading ? t.game.findingClue : t.setup.start}
          </button>
        </div>

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
            <div className="bg-gray-800 rounded-xl p-6 max-w-xs text-center relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setContinueGameId(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
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
