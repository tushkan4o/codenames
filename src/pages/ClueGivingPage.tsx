import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateBoard } from '../lib/boardGenerator';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { BOARD_CONFIGS } from '../types/game';
import type { BoardSize, Clue } from '../types/game';
import { useDragReorder } from '../hooks/useDragReorder';
import { HomeIcon, ArrowPathIcon, ArrowUturnLeftIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { BarsArrowDownIcon } from '@heroicons/react/24/solid';
import Board from '../components/board/Board';
import GameHeader from '../components/game/GameHeader';
import ClueInput from '../components/clue/ClueInput';
import SettingsPanel from '../components/settings/SettingsPanel';

export default function ClueGivingPage() {
  const navigate = useNavigate();
  const { user, saveSessionState, roamingState, clearRoamingState } = useAuth();
  const { t } = useTranslation();

  // All state comes from server — no URL params
  const [currentSeed, setCurrentSeed] = useState<string | null>(null);
  const [gameParams, setGameParams] = useState<URLSearchParams>(new URLSearchParams());
  const [isRanked, setIsRanked] = useState(true);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const boardSize = (gameParams.get('size') as BoardSize) || '5x5';
  const baseConfig = BOARD_CONFIGS[boardSize];
  const config = useMemo(() => {
    const r = gameParams.get('r');
    const b = gameParams.get('b');
    const a = gameParams.get('a');
    if (r || b || a) {
      const redCount = r ? Number(r) : baseConfig.redCount;
      const blueCount = b ? Number(b) : baseConfig.blueCount;
      const assassinCount = a ? Number(a) : baseConfig.assassinCount;
      const neutralCount = baseConfig.totalCards - redCount - blueCount - assassinCount;
      return { ...baseConfig, redCount, blueCount, assassinCount, neutralCount };
    }
    return baseConfig;
  }, [gameParams, baseConfig]);

  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch active captain game from server on mount (no URL params needed)
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;

    api.getActiveCaptainGame(user.id).then((raw) => {
      const game = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!game?.seed) {
        setLoadError(`Сервер не вернул seed: ${JSON.stringify(game)}`);
        return;
      }
      setCurrentSeed(game.seed);
      setGameParams(new URLSearchParams(game.params || ''));
      setIsRanked(game.ranked !== false);
      setReshuffleCount(game.reshuffleCount || 0);
      setLoading(false);
    }).catch((err) => {
      setLoadError(err instanceof Error ? err.message : String(err));
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedTargets, setSelectedTargets] = useState<number[]>([]);
  const [selectedNulls, setSelectedNulls] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [targetError, setTargetError] = useState('');

  // Submit animation state
  const [submitting, setSubmitting] = useState(false);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClueRef = useRef<object | null>(null);

  const board = useMemo(() => {
    if (!currentSeed) return null;
    return generateBoard(currentSeed, config);
  }, [currentSeed, config]);

  const {
    displayOrder, draggingOrigIdx,
    handlePointerDown, handlePointerMove, handlePointerUp,
    registerCardRef, resetOrder, setOrder,
  } = useDragReorder(board?.cards.length ?? 0);

  const [isSorted, setIsSorted] = useState(false);
  const [showReshuffleConfirm, setShowReshuffleConfirm] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Restore roaming state from another device (reactive — arrives async after claim)
  const roamingAppliedRef = useRef(false);
  useEffect(() => {
    if (!roamingState || roamingAppliedRef.current) return;
    roamingAppliedRef.current = true;
    if (Array.isArray(roamingState.selectedTargets)) {
      setSelectedTargets(roamingState.selectedTargets as number[]);
    }
    if (Array.isArray(roamingState.selectedNulls)) {
      setSelectedNulls(roamingState.selectedNulls as number[]);
    }
    // Note: seed and reshuffleCount come from server (captain-game), not roaming state
    clearRoamingState();
  }, [roamingState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save state to server on meaningful changes (debounced via saveSessionState)
  useEffect(() => {
    if (!user || !currentSeed || submitted || loading || roamingState) return;
    saveSessionState('/give-clue', { selectedTargets, selectedNulls, reshuffleCount });
  }, [selectedTargets, selectedNulls, reshuffleCount, currentSeed, submitted, loading, roamingState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect clue-0: if any non-red cards are selected as nulls
  const isClueZero = selectedNulls.length > 0;

  const submitDelay = user?.preferences.submitDelay ?? 2000;

  async function handleReshuffle() {
    if (!user) return;
    try {
      const game = await api.captainReshuffle(user.id);
      setCurrentSeed(game.seed);
      setReshuffleCount(game.reshuffleCount);
      setSelectedTargets([]);
      setSelectedNulls([]);
      setTargetError('');
      setIsSorted(false);
      resetOrder();
    } catch {
      setTargetError('Ошибка при смене слов');
    }
  }

  function handleReset() {
    setSelectedTargets([]);
    setSelectedNulls([]);
    setTargetError('');
    setIsSorted(false);
    resetOrder();
  }

  function handleSortByColor() {
    if (!board) return;
    if (isSorted) {
      setIsSorted(false);
      resetOrder();
      return;
    }
    const sortMode = user?.preferences.colorSortMode || 'rows';
    // Sort: red → neutral → assassin → blue
    const colorPriority: Record<string, number> = { red: 0, neutral: 1, assassin: 2, blue: 3 };
    const sorted = board.cards.map((_, i) => i);
    sorted.sort((a, b) => {
      const ca = colorPriority[board.cards[a].color] ?? 1;
      const cb = colorPriority[board.cards[b].color] ?? 1;
      return ca - cb;
    });

    if (sortMode === 'columns') {
      // Transpose: fill columns instead of rows
      const cols = config.cols;
      const rows = Math.ceil(sorted.length / cols);
      const transposed: number[] = new Array(sorted.length);
      for (let i = 0; i < sorted.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const newIdx = col * rows + row;
        transposed[newIdx < sorted.length ? newIdx : i] = sorted[i];
      }
      setOrder(transposed);
    } else {
      setOrder(sorted);
    }
    setIsSorted(true);
  }

  function handleCardClick(index: number) {
    if (!board || submitting) return;
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
    if (submitting) return false;
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
  }, [handlePointerUp, submitting]);

  function cancelSubmit() {
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    pendingClueRef.current = null;
    setSubmitting(false);
  }

  async function doSubmit() {
    if (!pendingClueRef.current) return;
    try {
      await api.saveClue(pendingClueRef.current as Clue);
      setSubmitted(true);
      // Server clears captain game on submit; clear roaming state too
      saveSessionState('/', null);
    } catch (err) {
      setTargetError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
    pendingClueRef.current = null;
    setSubmitting(false);
  }

  function handleSubmitClue(word: string, number: number) {
    if (!user || !currentSeed) return;
    if (selectedTargets.length === 0) {
      setTargetError(t.clue.errorNeedsTargets);
      return;
    }
    const clue = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
      ranked: isRanked,
      ...(config.redCount !== baseConfig.redCount ? { redCount: config.redCount } : {}),
      ...(config.blueCount !== baseConfig.blueCount ? { blueCount: config.blueCount } : {}),
      ...(config.assassinCount !== baseConfig.assassinCount ? { assassinCount: config.assassinCount } : {}),
    };

    // If submitDelay is 0, submit immediately
    if (submitDelay === 0) {
      pendingClueRef.current = clue;
      doSubmit();
      return;
    }

    // Start submit animation
    pendingClueRef.current = clue;
    setSubmitting(true);
    setTargetError('');
    submitTimerRef.current = setTimeout(() => {
      submitTimerRef.current = null;
      doSubmit();
    }, submitDelay);
  }

  async function handleGiveAnother() {
    if (!user) return;
    try {
      const game = await api.getActiveCaptainGame(user.id);
      setCurrentSeed(game.seed);
      setIsRanked(game.ranked !== false);
      setReshuffleCount(game.reshuffleCount);
      setSelectedTargets([]);
      setSelectedNulls([]);
      setTargetError('');
      setSubmitted(false);
      setIsSorted(false);
    } catch {
      navigate('/');
    }
  }

  // Loading state while fetching server seed
  if (loading || !board || !currentSeed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        {loadError ? (
          <>
            <div className="text-red-400 text-sm max-w-sm text-center">{loadError}</div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
            >
              На главную
            </button>
          </>
        ) : (
          <div className="text-gray-400 text-lg animate-pulse">Загрузка...</div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-board-blue">{t.game.clueSubmitted}</h2>
        <p className="text-gray-400">{t.game.othersCanGuess}</p>
        <div className="flex gap-3">
          <button
            onClick={() => { saveSessionState('/', null); navigate('/'); }}
            className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <HomeIcon className="w-5 h-5" />
            {t.game.home}
          </button>
          <button
            onClick={handleGiveAnother}
            className="px-6 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowPathIcon className="w-5 h-5" />
            {t.game.giveAnotherClue}
          </button>
        </div>
      </div>
    );
  }

  const clueNumber = isClueZero ? 0 : selectedTargets.length;

  return (
    <div className="min-h-screen px-2 sm:px-4 py-4 sm:py-6">
      <GameHeader mode="clue-giving" config={config} ranked={isRanked} />

      {/* Action buttons */}
      <div className={`flex flex-wrap justify-center gap-2 mb-3 transition-opacity ${submitting ? 'opacity-30 pointer-events-none' : ''}`}>
        <button
          onClick={() => setShowHomeConfirm(true)}
          className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors inline-flex items-center"
          title={t.game.home}
        >
          <HomeIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowReshuffleConfirm(true)}
          className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors inline-flex items-center gap-1"
          title={t.game.reshuffle}
        >
          <ArrowPathIcon className="w-4 h-4" />
          {reshuffleCount > 0 && (
            <span className="text-gray-300 text-xs">({reshuffleCount})</span>
          )}
        </button>
        <button
          onClick={handleSortByColor}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border inline-flex items-center ${
            isSorted
              ? 'bg-board-blue/30 text-board-blue border-board-blue/40'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-transparent'
          }`}
          title={t.game.sortByColor}
        >
          <BarsArrowDownIcon className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors inline-flex items-center"
          title={t.game.reset}
        >
          <ArrowUturnLeftIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowHelp(true)}
          className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors inline-flex items-center"
          title={t.help.title}
        >
          <QuestionMarkCircleIcon className="w-4 h-4" />
        </button>
        <SettingsPanel mode="clue-giving" />
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowHelp(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <h3 className="text-white font-bold text-lg mb-3">{t.help.captainTitle}</h3>
            <p className="text-gray-300 text-sm whitespace-pre-line">{t.help.captainRules}</p>
          </div>
        </div>
      )}

      {showHomeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowHomeConfirm(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 text-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowHomeConfirm(false)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <p className="text-white text-sm mb-4">{t.game.confirmHomeClueGiving}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowHomeConfirm(false)}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-colors"
              >
                {t.rating.cancel}
              </button>
              <button
                onClick={() => { saveSessionState('/', null); navigate('/'); }}
                className="px-5 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-semibold transition-colors"
              >
                {t.admin.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReshuffleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowReshuffleConfirm(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 text-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowReshuffleConfirm(false)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <p className="text-white text-sm mb-4">{t.game.reshuffleWarning}, продолжить?</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowReshuffleConfirm(false)}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-colors"
              >
                {t.rating.cancel}
              </button>
              <button
                onClick={() => { setShowReshuffleConfirm(false); handleReshuffle(); }}
                className="px-5 py-2 rounded-lg bg-board-red hover:brightness-110 text-white font-semibold transition-colors"
              >
                {t.admin.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main hint */}
      <div className={`transition-opacity ${submitting ? 'opacity-30' : ''}`}>
        <p className="text-center text-gray-400 text-sm mb-1">
          {t.game.selectTargetsTeam} <span className="text-board-red font-semibold">{t.game.yourTeam}</span> ({selectedTargets.length} {t.game.selected})
        </p>
        <p className="text-center text-gray-500 text-xs mb-1">
          {t.game.clueZeroHint}
        </p>
      </div>

      <Board
        cards={board.cards}
        columns={config.cols}
        showColors={true}
        selectedIndices={[]}
        targetIndices={selectedTargets}
        nullIndices={selectedNulls}
        highlightTargets={submitting}
        disabled={submitting}
        displayOrder={submitting ? undefined : displayOrder}
        draggingOrigIdx={submitting ? null : draggingOrigIdx}
        onPointerDown={submitting ? undefined : handlePointerDown}
        onPointerMove={submitting ? undefined : handlePointerMove}
        onPointerUp={submitting ? undefined : onBoardPointerUp}
        registerCardRef={submitting ? undefined : registerCardRef}
        cardFontSize={user?.preferences.cardFontSize}
      />

      {/* Clue input */}
      <div className="mt-4">
        <ClueInput
          boardCards={board.cards}
          targetCount={clueNumber}
          onSubmit={handleSubmitClue}
          submitting={submitting}
          submitDelay={submitDelay}
          onCancel={cancelSubmit}
          externalError={targetError}
        />
      </div>
    </div>
  );
}
