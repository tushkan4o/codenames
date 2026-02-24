import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { generateBoard, generateSeed } from '../lib/boardGenerator';
import { mockApi } from '../mock/mockApi';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { BOARD_CONFIGS } from '../types/game';
import type { BoardSize, WordPack } from '../types/game';
import Board from '../components/board/Board';
import GameHeader from '../components/game/GameHeader';
import ClueInput from '../components/clue/ClueInput';

export default function ClueGivingPage() {
  const { seed: rawSeed } = useParams<{ seed: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const wordPack = (searchParams.get('pack') as WordPack) || 'ru';
  const boardSize = (searchParams.get('size') as BoardSize) || '5x5';
  const config = BOARD_CONFIGS[boardSize];

  const [currentSeed, setCurrentSeed] = useState(rawSeed ? decodeURIComponent(rawSeed) : generateSeed());
  const [selectedTargets, setSelectedTargets] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [targetError, setTargetError] = useState('');

  const board = useMemo(() => {
    return generateBoard(currentSeed, config, wordPack);
  }, [currentSeed, config, wordPack]);

  function handleReshuffle() {
    const newSeed = generateSeed();
    setCurrentSeed(newSeed);
    setSelectedTargets([]);
    setTargetError('');
    setReshuffleCount((prev) => prev + 1);
    window.history.replaceState(
      null,
      '',
      `/give-clue/${encodeURIComponent(newSeed)}?pack=${wordPack}&size=${boardSize}`,
    );
  }

  function toggleTarget(index: number) {
    // Only allow selecting red cards
    if (board.cards[index].color !== 'red') return;
    setSelectedTargets((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
    setTargetError('');
  }

  async function handleSubmitClue(word: string, number: number) {
    if (!user) return;
    // Validate target count matches clue number
    if (selectedTargets.length !== number) {
      setTargetError(t.game.targetsMismatch.replace('{n}', String(number)));
      return;
    }
    const clue = {
      id: `${currentSeed}-${Date.now()}`,
      word,
      number,
      boardSeed: currentSeed,
      targetIndices: selectedTargets,
      createdAt: Date.now(),
      userId: user.id,
      wordPack,
      boardSize,
      reshuffleCount,
    };
    await mockApi.saveClue(clue);
    setSubmitted(true);
  }

  function handleGiveAnother() {
    const newSeed = generateSeed();
    setCurrentSeed(newSeed);
    setSelectedTargets([]);
    setTargetError('');
    setSubmitted(false);
    setReshuffleCount(0);
    window.history.replaceState(
      null,
      '',
      `/give-clue/${encodeURIComponent(newSeed)}?pack=${wordPack}&size=${boardSize}`,
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <h2 className="text-2xl font-bold text-green-400">{t.game.clueSubmitted}</h2>
        <p className="text-gray-400">{t.game.othersCanGuess}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
          >
            {t.game.home}
          </button>
          <button
            onClick={handleGiveAnother}
            className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors"
          >
            {t.game.giveAnotherClue}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <GameHeader mode="clue-giving" config={config} />

      {/* Action buttons */}
      <div className="flex justify-center gap-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition-colors"
        >
          {t.game.home}
        </button>
        <button
          onClick={handleReshuffle}
          className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold transition-colors"
          title={t.game.reshuffleWarning}
        >
          {t.game.reshuffle}
          {reshuffleCount > 0 && (
            <span className="ml-1 text-amber-300">({reshuffleCount})</span>
          )}
        </button>
      </div>

      {reshuffleCount > 0 && (
        <p className="text-center text-amber-400 text-xs mb-2">{t.game.reshuffleWarning}</p>
      )}

      <p className="text-center text-gray-400 text-sm mb-1">
        {t.game.selectTargets} ({selectedTargets.length} {t.game.selected})
      </p>
      <p className="text-center text-gray-500 text-xs mb-2">
        {t.game.selectTargetsHint}
      </p>
      {targetError && (
        <p className="text-center text-red-400 text-sm mb-2">{targetError}</p>
      )}

      <Board
        cards={board.cards}
        columns={config.cols}
        showColors={true}
        selectedIndices={selectedTargets}
        targetIndices={selectedTargets}
        onCardClick={toggleTarget}
      />

      <div className="mt-6">
        <ClueInput boardCards={board.cards} maxNumber={config.redCount} onSubmit={handleSubmitClue} />
      </div>
    </div>
  );
}
