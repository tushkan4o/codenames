import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { generateBoard, generateSeed } from '../lib/boardGenerator';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { BOARD_CONFIGS } from '../types/game';
import type { BoardSize } from '../types/game';
import Board from '../components/board/Board';
import GameHeader from '../components/game/GameHeader';
import ClueInput from '../components/clue/ClueInput';

type AvoidPhase = 'nulls' | 'targets';

export default function ClueGivingPage() {
  const { seed: rawSeed } = useParams<{ seed: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const boardSize = (searchParams.get('size') as BoardSize) || '5x5';
  const config = BOARD_CONFIGS[boardSize];

  const [currentSeed, setCurrentSeed] = useState(rawSeed ? decodeURIComponent(rawSeed) : generateSeed());
  const [selectedTargets, setSelectedTargets] = useState<number[]>([]);
  const [selectedNulls, setSelectedNulls] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [targetError, setTargetError] = useState('');
  const [avoidMode, setAvoidMode] = useState(false);
  const [avoidPhase, setAvoidPhase] = useState<AvoidPhase>('nulls');

  const board = useMemo(() => {
    return generateBoard(currentSeed, config);
  }, [currentSeed, config]);

  function handleReshuffle() {
    const newSeed = generateSeed();
    setCurrentSeed(newSeed);
    setSelectedTargets([]);
    setSelectedNulls([]);
    setTargetError('');
    setReshuffleCount((prev) => prev + 1);
    setAvoidPhase('nulls');
    window.history.replaceState(
      null,
      '',
      `/give-clue/${encodeURIComponent(newSeed)}?size=${boardSize}`,
    );
  }

  function handleReset() {
    setSelectedTargets([]);
    setSelectedNulls([]);
    setTargetError('');
    if (avoidMode) setAvoidPhase('nulls');
  }

  function toggleAvoidMode() {
    setAvoidMode((prev) => {
      if (!prev) {
        setSelectedTargets([]);
        setSelectedNulls([]);
        setAvoidPhase('nulls');
      } else {
        setSelectedNulls([]);
        setSelectedTargets([]);
      }
      return !prev;
    });
    setTargetError('');
  }

  function handleCardClick(index: number) {
    if (avoidMode) {
      if (avoidPhase === 'nulls') {
        if (board.cards[index].color === 'red') return;
        setSelectedNulls((prev) =>
          prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
        );
      } else {
        if (board.cards[index].color !== 'red') return;
        setSelectedTargets((prev) =>
          prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
        );
      }
    } else {
      if (board.cards[index].color !== 'red') return;
      setSelectedTargets((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
      );
    }
    setTargetError('');
  }

  function handleAdvanceToTargets() {
    if (selectedNulls.length === 0) {
      setTargetError(t.clue.errorNeedsNulls);
      return;
    }
    setAvoidPhase('targets');
    setTargetError('');
  }

  async function handleSubmitClue(word: string, number: number) {
    if (!user) return;
    if (avoidMode) {
      if (selectedNulls.length === 0) {
        setTargetError(t.clue.errorNeedsNulls);
        return;
      }
      if (selectedTargets.length === 0) {
        setTargetError(t.clue.errorNeedsTargets);
        return;
      }
    } else {
      if (selectedTargets.length === 0) {
        setTargetError(t.game.targetsMismatch.replace('{n}', String(number)));
        return;
      }
    }
    const clue = {
      id: `${currentSeed}-${Date.now()}`,
      word,
      number: avoidMode ? 0 : number,
      boardSeed: currentSeed,
      targetIndices: selectedTargets,
      nullIndices: selectedNulls,
      createdAt: Date.now(),
      userId: user.id,
      wordPack: 'ru',
      boardSize,
      reshuffleCount,
    };
    try {
      await api.saveClue(clue);
      setSubmitted(true);
    } catch (err) {
      setTargetError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  }

  function handleGiveAnother() {
    const newSeed = generateSeed();
    setCurrentSeed(newSeed);
    setSelectedTargets([]);
    setSelectedNulls([]);
    setTargetError('');
    setSubmitted(false);
    setReshuffleCount(0);
    setAvoidMode(false);
    setAvoidPhase('nulls');
    window.history.replaceState(
      null,
      '',
      `/give-clue/${encodeURIComponent(newSeed)}?size=${boardSize}`,
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-board-blue">{t.game.clueSubmitted}</h2>
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
            className="px-6 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold transition-colors"
          >
            {t.game.giveAnotherClue}
          </button>
        </div>
      </div>
    );
  }

  const clueNumber = avoidMode ? 0 : selectedTargets.length;
  const hasSelections = selectedTargets.length > 0 || selectedNulls.length > 0;

  return (
    <div className="min-h-screen px-2 sm:px-4 py-4 sm:py-6">
      <GameHeader mode="clue-giving" config={config} />

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <button
          onClick={() => navigate('/')}
          className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors"
        >
          {t.game.home}
        </button>
        <button
          onClick={handleReshuffle}
          className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold transition-colors"
          title={t.game.reshuffleWarning}
        >
          {t.game.reshuffle}
          {reshuffleCount > 0 && (
            <span className="ml-1 text-gray-300">({reshuffleCount})</span>
          )}
        </button>
        <button
          onClick={toggleAvoidMode}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            avoidMode
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {t.game.avoidMode}
        </button>
        {hasSelections && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors"
          >
            {t.game.reset}
          </button>
        )}
      </div>

      {reshuffleCount > 0 && (
        <p className="text-center text-board-red text-xs mb-2">{t.game.reshuffleWarning}</p>
      )}

      {/* Phase hints */}
      {avoidMode ? (
        <>
          <p className="text-center text-gray-400 text-sm mb-1">
            {avoidPhase === 'nulls'
              ? `${t.game.avoidPhase} (${selectedNulls.length} ${t.game.nulled})`
              : `${t.game.targetPhase} (${selectedTargets.length} ${t.game.selected})`}
          </p>
          <p className="text-center text-gray-500 text-xs mb-1">
            {avoidPhase === 'nulls' ? t.game.avoidPhaseHint : t.game.targetPhaseHint}
          </p>
        </>
      ) : (
        <>
          <p className="text-center text-gray-400 text-sm mb-1">
            {t.game.selectTargetsTeam} <span className="text-board-red font-semibold">{t.game.yourTeam}</span> ({selectedTargets.length} {t.game.selected})
          </p>
          <p className="text-center text-gray-500 text-xs mb-1">{t.game.selectTargetsHint}</p>
        </>
      )}
      {targetError && (
        <p className="text-center text-board-red text-sm mb-2">{targetError}</p>
      )}

      <Board
        cards={board.cards}
        columns={config.cols}
        showColors={true}
        selectedIndices={[]}
        targetIndices={selectedTargets}
        nullIndices={selectedNulls}
        onCardClick={handleCardClick}
      />

      {/* Avoid mode: advance button */}
      {avoidMode && avoidPhase === 'nulls' && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleAdvanceToTargets}
            className="px-6 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold transition-colors"
          >
            {t.game.switchToTargets}
          </button>
        </div>
      )}

      {/* Clue input: show when not in nulls phase of avoid mode */}
      {(!avoidMode || avoidPhase === 'targets') && (
        <div className="mt-4">
          <ClueInput boardCards={board.cards} targetCount={clueNumber} onSubmit={handleSubmitClue} />
        </div>
      )}
    </div>
  );
}
