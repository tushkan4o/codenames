import { useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { generateBoard, generateSeed } from '../lib/boardGenerator';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { BOARD_CONFIGS } from '../types/game';
import type { BoardSize } from '../types/game';
import { useDragReorder } from '../hooks/useDragReorder';
import Board from '../components/board/Board';
import GameHeader from '../components/game/GameHeader';
import ClueInput from '../components/clue/ClueInput';

export default function ClueGivingPage() {
  const { seed: rawSeed } = useParams<{ seed: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const boardSize = (searchParams.get('size') as BoardSize) || '5x5';
  const baseConfig = BOARD_CONFIGS[boardSize];
  const config = useMemo(() => {
    const r = searchParams.get('r');
    const b = searchParams.get('b');
    const a = searchParams.get('a');
    if (r || b || a) {
      const redCount = r ? Number(r) : baseConfig.redCount;
      const blueCount = b ? Number(b) : baseConfig.blueCount;
      const assassinCount = a ? Number(a) : baseConfig.assassinCount;
      const neutralCount = baseConfig.totalCards - redCount - blueCount - assassinCount;
      return { ...baseConfig, redCount, blueCount, assassinCount, neutralCount };
    }
    return baseConfig;
  }, [searchParams, baseConfig]);

  const [currentSeed, setCurrentSeed] = useState(rawSeed ? decodeURIComponent(rawSeed) : generateSeed());
  const [selectedTargets, setSelectedTargets] = useState<number[]>([]);
  const [selectedNulls, setSelectedNulls] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [targetError, setTargetError] = useState('');

  const board = useMemo(() => {
    return generateBoard(currentSeed, config);
  }, [currentSeed, config]);

  const {
    displayOrder, draggingOrigIdx,
    handlePointerDown, handlePointerMove, handlePointerUp,
    registerCardRef, resetOrder, setOrder,
  } = useDragReorder(board.cards.length);

  const [isSorted, setIsSorted] = useState(false);

  // Auto-detect clue-0: if any non-red cards are selected as nulls
  const isClueZero = selectedNulls.length > 0;

  function handleReshuffle() {
    const newSeed = generateSeed();
    setCurrentSeed(newSeed);
    setSelectedTargets([]);
    setSelectedNulls([]);
    setTargetError('');
    setReshuffleCount((prev) => prev + 1);
    setIsSorted(false);
    resetOrder();
    window.history.replaceState(
      null,
      '',
      `/give-clue/${encodeURIComponent(newSeed)}?${searchParams}`,
    );
  }

  function handleReset() {
    setSelectedTargets([]);
    setSelectedNulls([]);
    setTargetError('');
    setIsSorted(false);
    resetOrder();
  }

  function handleSortByColor() {
    if (isSorted) {
      setIsSorted(false);
      resetOrder();
      return;
    }
    // Sort: red → neutral → assassin → blue (top to bottom)
    const colorPriority: Record<string, number> = { red: 0, neutral: 1, assassin: 2, blue: 3 };
    const sorted = board.cards.map((_, i) => i);
    sorted.sort((a, b) => {
      const ca = colorPriority[board.cards[a].color] ?? 1;
      const cb = colorPriority[board.cards[b].color] ?? 1;
      return ca - cb;
    });
    setIsSorted(true);
    setOrder(sorted);
  }

  function handleCardClick(index: number) {
    const card = board.cards[index];

    if (card.color === 'red') {
      // Red cards → target selection (toggle)
      setSelectedTargets((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
      );
    } else {
      // Non-red cards → null selection (auto-enters clue-0 mode)
      setSelectedNulls((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
      );
    }
    setTargetError('');
  }

  // Pointer up wrapper: if it was a click (not drag), handle card click
  const handleCardClickRef = useRef(handleCardClick);
  handleCardClickRef.current = handleCardClick;
  const displayOrderRef = useRef(displayOrder);
  displayOrderRef.current = displayOrder;

  const onBoardPointerUp = useCallback((e: React.PointerEvent): boolean => {
    const wasDrag = handlePointerUp(e);
    if (!wasDrag) {
      const slotEl = (e.target as HTMLElement).closest('[data-visual-index]') as HTMLElement | null;
      if (slotEl) {
        const visualIdx = Number(slotEl.dataset.visualIndex);
        const originalIdx = displayOrderRef.current[visualIdx];
        handleCardClickRef.current(originalIdx);
      }
    }
    return wasDrag;
  }, [handlePointerUp]);

  async function handleSubmitClue(word: string, number: number) {
    if (!user) return;
    if (isClueZero) {
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
      number: isClueZero ? 0 : number,
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
    setIsSorted(false);
    window.history.replaceState(
      null,
      '',
      `/give-clue/${encodeURIComponent(newSeed)}?${searchParams}`,
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

  const clueNumber = isClueZero ? 0 : selectedTargets.length;

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
          onClick={handleSortByColor}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            isSorted
              ? 'bg-board-blue/30 text-board-blue border border-board-blue/40'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {t.game.sortByColor}
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors"
        >
          {t.game.reset}
        </button>
      </div>

      {reshuffleCount > 0 && (
        <p className="text-center text-board-red text-xs mb-2">{t.game.reshuffleWarning}</p>
      )}

      {/* Main hint */}
      <p className="text-center text-gray-400 text-sm mb-1">
        {t.game.selectTargetsTeam} <span className="text-board-red font-semibold">{t.game.yourTeam}</span> ({selectedTargets.length} {t.game.selected})
      </p>
      <p className="text-center text-gray-500 text-xs mb-1">
        {t.game.clueZeroHint}
      </p>
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
        displayOrder={displayOrder}
        draggingOrigIdx={draggingOrigIdx}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={onBoardPointerUp}
        registerCardRef={registerCardRef}
      />

      {/* Clue input */}
      <div className="mt-4">
        <ClueInput boardCards={board.cards} targetCount={clueNumber} onSubmit={handleSubmitClue} />
      </div>
    </div>
  );
}
