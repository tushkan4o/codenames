import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { generateSeed } from '../lib/boardGenerator';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import type { BoardSize, GameMode, RuleSet } from '../types/game';

export default function SetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<GameMode>('clue-giving');
  const [boardSize, setBoardSize] = useState<BoardSize>(user?.preferences.defaultBoardSize ?? '5x5');
  const [ruleSet, setRuleSet] = useState<RuleSet>('default');
  const [loading, setLoading] = useState(false);
  const [puzzleCount, setPuzzleCount] = useState<{ available: number; total: number } | null>(null);

  useEffect(() => {
    if (!user || mode !== 'guessing') {
      setPuzzleCount(null);
      return;
    }
    api.getClueCount(user.id, 'ru', boardSize).then(setPuzzleCount).catch(() => setPuzzleCount(null));
  }, [user, mode, boardSize]);

  async function handleStart() {
    if (!user) return;

    if (mode === 'clue-giving') {
      const seed = generateSeed();
      navigate(`/give-clue/${encodeURIComponent(seed)}?size=${boardSize}&rules=${ruleSet}`);
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

        {/* Board Size */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">{t.setup.boardSize}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setBoardSize('4x4')}
              className={`p-3 rounded-lg border-2 transition-colors text-center ${
                boardSize === '4x4'
                  ? 'border-board-blue/60 bg-board-blue/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <p className="font-bold text-white">4 x 4</p>
              <p className="text-xs text-gray-400">6 / 5 / 4 / 1</p>
            </button>
            <button
              onClick={() => setBoardSize('5x5')}
              className={`p-3 rounded-lg border-2 transition-colors text-center ${
                boardSize === '5x5'
                  ? 'border-board-blue/60 bg-board-blue/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <p className="font-bold text-white">5 x 5</p>
              <p className="text-xs text-gray-400">10 / 9 / 5 / 1</p>
            </button>
          </div>
        </div>

        {/* Rules */}
        <div className="mb-8">
          <label className="block text-sm text-gray-400 mb-2">{t.setup.rules}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRuleSet('default')}
              className={`p-3 rounded-lg border-2 transition-colors font-bold ${
                ruleSet === 'default'
                  ? 'border-board-blue/60 bg-board-blue/10 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t.setup.default}
            </button>
            <button
              onClick={() => setRuleSet('strict')}
              className={`p-3 rounded-lg border-2 transition-colors font-bold ${
                ruleSet === 'strict'
                  ? 'border-board-blue/60 bg-board-blue/10 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t.setup.strict}
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
