import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { generateSeed } from '../lib/boardGenerator';
import { mockApi } from '../mock/mockApi';
import NavBar from '../components/layout/NavBar';
import type { BoardSize, GameMode, RuleSet, WordPack } from '../types/game';

export default function SetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<GameMode>('clue-giving');
  const [wordPack, setWordPack] = useState<WordPack>(user?.preferences.defaultWordPack ?? 'en');
  const [boardSize, setBoardSize] = useState<BoardSize>(user?.preferences.defaultBoardSize ?? '5x5');
  const [ruleSet, setRuleSet] = useState<RuleSet>('default');
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!user) return;

    if (mode === 'clue-giving') {
      const seed = generateSeed();
      navigate(`/give-clue/${encodeURIComponent(seed)}?pack=${wordPack}&size=${boardSize}&rules=${ruleSet}`);
    } else {
      setLoading(true);
      const clue = await mockApi.getRandomClue(user.id, [], wordPack, boardSize);
      setLoading(false);
      if (clue) {
        navigate(`/guess/${clue.id}`);
      } else {
        alert(t.game.noClues);
      }
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-10">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">{t.setup.title}</h1>

        {/* Mode */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">{t.setup.mode}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('clue-giving')}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                mode === 'clue-giving'
                  ? 'border-purple-500 bg-purple-900/30'
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
                  ? 'border-cyan-500 bg-cyan-900/30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <p className="font-bold text-white">{t.setup.guessing}</p>
              <p className="text-xs text-gray-400 mt-1">{t.setup.guessingDesc}</p>
            </button>
          </div>
        </div>

        {/* Word Pack */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">{t.setup.wordPack}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setWordPack('en')}
              className={`p-3 rounded-lg border-2 transition-colors font-bold ${
                wordPack === 'en'
                  ? 'border-green-500 bg-green-900/30 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t.setup.english}
            </button>
            <button
              onClick={() => setWordPack('ru')}
              className={`p-3 rounded-lg border-2 transition-colors font-bold ${
                wordPack === 'ru'
                  ? 'border-green-500 bg-green-900/30 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t.setup.russian}
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
                  ? 'border-yellow-500 bg-yellow-900/30'
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
                  ? 'border-yellow-500 bg-yellow-900/30'
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
                  ? 'border-blue-500 bg-blue-900/30 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t.setup.default}
            </button>
            <button
              onClick={() => setRuleSet('strict')}
              className={`p-3 rounded-lg border-2 transition-colors font-bold ${
                ruleSet === 'strict'
                  ? 'border-blue-500 bg-blue-900/30 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t.setup.strict}
            </button>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg transition-colors disabled:opacity-50"
        >
          {loading ? t.game.findingClue : t.setup.start}
        </button>
      </div>
    </div>
  );
}
