import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { computeGuessScore } from '../lib/scoring';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { BOARD_CONFIGS, BOARD_CONFIG_LEGACY_5x5 } from '../types/game';
import type { Clue, CardState } from '../types/game';
import { HomeIcon, ArrowPathIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import Board from '../components/board/Board';
import GameHeader from '../components/game/GameHeader';
import ClueDisplay from '../components/clue/ClueDisplay';
import RevealOverlay from '../components/game/RevealOverlay';
import ClueRating from '../components/game/ClueRating';
import ClueStatsPanel, { type AttemptDetail, pluralAttempts } from '../components/game/ClueStatsPanel';
import SettingsPanel from '../components/settings/SettingsPanel';
type GamePhase = 'picking' | 'revealing' | 'done';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ACTIVE_GUESS_KEY = 'codenames_active_guess';

interface ActiveGuessState {
  clueId: string;
  pickedIndices: number[];
  timestamp: number;
}

function saveActiveGuess(clueId: string, pickedIndices: number[]) {
  localStorage.setItem(ACTIVE_GUESS_KEY, JSON.stringify({ clueId, pickedIndices, timestamp: Date.now() }));
}

function clearActiveGuess() {
  localStorage.removeItem(ACTIVE_GUESS_KEY);
}

function loadActiveGuess(): ActiveGuessState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_GUESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

const COMPLETED_GUESS_KEY = 'codenames_completed_guess';

interface CompletedGuessState {
  clueId: string;
  pickedIndices: number[];
  score: number;
  targetIndices: number[];
  nullIndices: number[];
}

function saveCompletedGuess(state: CompletedGuessState) {
  localStorage.setItem(COMPLETED_GUESS_KEY, JSON.stringify(state));
}

function loadCompletedGuess(clueId: string): CompletedGuessState | null {
  try {
    const raw = localStorage.getItem(COMPLETED_GUESS_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state.clueId !== clueId) return null;
    return state;
  } catch { return null; }
}


export default function GuessingPage() {
  const { clueId } = useParams<{ clueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [clue, setClue] = useState<Clue | null>(null);
  const [pickedIndices, setPickedIndices] = useState<number[]>([]);
  const [phase, setPhase] = useState<GamePhase>('picking');
  const [assassinHit, setAssassinHit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [showNoClues, setShowNoClues] = useState(false);
  const [revealDelays, setRevealDelays] = useState<Record<number, number>>({});
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [revealingIndices, setRevealingIndices] = useState<Set<number>>(new Set());

  // Revealed targets — only populated after game ends (security: not sent initially)
  const [revealedTargets, setRevealedTargets] = useState<number[]>([]);
  const [revealedNulls, setRevealedNulls] = useState<number[]>([]);

  // Viewing another player's attempt picks
  const [viewingAttemptPicks, setViewingAttemptPicks] = useState<number[] | null>(null);
  const [pickPercents, setPickPercents] = useState<Record<number, number>>({});

  // Attempts view in overlay
  const [attemptsView, setAttemptsView] = useState<AttemptDetail[] | null>(null);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number | null>(null);

  useEffect(() => {
    async function loadClue() {
      if (!clueId) return;
      setPhase('picking');
      setAssassinHit(false);
      setScore(0);
      setRevealDelays({});
      setRevealingIndices(new Set());
      setRevealedTargets([]);
      setRevealedNulls([]);
      setViewingAttemptPicks(null);
      setPickPercents({});
      setAttemptsView(null);
      setSelectedAttemptIdx(null);
      setLoading(true);
      const found = await api.getClueById(clueId);
      setClue(found);

      // Restore completed game from localStorage (e.g. after back-navigation)
      const completed = loadCompletedGuess(clueId);
      if (completed) {
        setPickedIndices(completed.pickedIndices);
        setScore(completed.score);
        setRevealedTargets(completed.targetIndices);
        setRevealedNulls(completed.nullIndices);
        setPhase('done');
        // Re-fetch pick percentages
        api.getClueStats(clueId).then((s) => {
          if (s.attempts > 0) {
            const pcts: Record<number, number> = {};
            const counts = (s as { pickCounts?: Record<number, number> }).pickCounts || {};
            for (const [idx, cnt] of Object.entries(counts)) {
              pcts[Number(idx)] = Math.round((cnt as number / s.attempts) * 100);
            }
            setPickPercents(pcts);
          }
        });
        setLoading(false);
        return;
      }

      // Restore in-progress game from localStorage
      const saved = loadActiveGuess();
      if (saved && saved.clueId === clueId && saved.pickedIndices.length > 0) {
        setPickedIndices(saved.pickedIndices);
      } else {
        setPickedIndices([]);
      }

      setLoading(false);
    }
    loadClue();
  }, [clueId]);

  const config = useMemo(() => {
    if (!clue) return BOARD_CONFIGS['5x5'];
    const base = clue.boardSize ? BOARD_CONFIGS[clue.boardSize] : BOARD_CONFIG_LEGACY_5x5;
    // Use custom color counts if stored on the clue
    if (clue.redCount != null || clue.blueCount != null || clue.assassinCount != null) {
      const redCount = clue.redCount ?? base.redCount;
      const blueCount = clue.blueCount ?? base.blueCount;
      const assassinCount = clue.assassinCount ?? base.assassinCount;
      const neutralCount = base.totalCards - redCount - blueCount - assassinCount;
      return { ...base, redCount, blueCount, assassinCount, neutralCount };
    }
    return base;
  }, [clue]);

  const board = useMemo(() => {
    if (!clue || !clue.words || !clue.colors) return null;
    const cards: CardState[] = clue.words.map((word, i) => ({
      word,
      color: clue.colors![i] as CardState['color'],
      revealed: false,
      position: i,
    }));
    return { seed: '', cards, startingTeam: 'red' as const, config };
  }, [clue, config]);

  const animationEnabled = user?.preferences.animationEnabled ?? true;
  const revealDuration = user?.preferences.revealDuration ?? 1000;

  // For clue-0, we don't know the target count (hidden for security), so no auto-end
  const effectiveTargetCount = useMemo(() => {
    if (!clue) return 0;
    return clue.number; // 0 for clue-0 (no auto-end), N for normal clues
  }, [clue]);

  const redPickedCount = useMemo(() => {
    if (!board) return 0;
    return pickedIndices.filter((i) => board.cards[i].color === 'red').length;
  }, [pickedIndices, board]);

  const colorCounts = useMemo(() => {
    if (!board) return null;
    const counts = { red: 0, blue: 0, neutral: 0, assassin: 0 };
    for (const card of board.cards) {
      counts[card.color as keyof typeof counts]++;
    }
    return counts;
  }, [board]);

  function handleHome() {
    if (phase === 'picking') {
      setShowHomeConfirm(true);
    } else {
      navigate('/');
    }
  }

  async function handleAnotherClue() {
    if (!user) return;
    try {
      const newClue = await api.getRandomClue(user.id, clue ? [clue.id] : [], undefined, undefined, clue?.ranked);
      if (newClue) {
        navigate(`/guess/${newClue.id}`);
      } else {
        setShowNoClues(true);
      }
    } catch {
      setShowNoClues(true);
    }
  }

  // Track reveal timeouts so we can cancel them
  const [revealTimers, setRevealTimers] = useState<Record<number, ReturnType<typeof setTimeout>>>({});

  function handlePick(index: number) {
    if (phase !== 'picking' || !board || !clue) return;
    if (pickedIndices.includes(index)) return;

    // If clicking a card that's currently revealing, cancel the reveal
    if (revealingIndices.has(index)) {
      clearTimeout(revealTimers[index]);
      setRevealTimers((prev) => { const next = { ...prev }; delete next[index]; return next; });
      setRevealingIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }

    setConfirmEnd(false);

    // Cancel any currently revealing cards (only one at a time)
    if (revealingIndices.size > 0) {
      revealingIndices.forEach((revIdx) => {
        clearTimeout(revealTimers[revIdx]);
      });
      setRevealTimers({});
      setRevealingIndices(new Set());
    }

    // Start border trace animation
    setRevealingIndices(new Set([index]));

    // After animation completes, reveal the card
    const timer = setTimeout(() => {
      setRevealTimers((prev) => { const next = { ...prev }; delete next[index]; return next; });
      setRevealingIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });

      setPickedIndices((prev) => {
        const newPicked = [...prev, index];
        const card = board!.cards[index];

        if (card.color === 'assassin') {
          setAssassinHit(true);
          setScore(0);
          clearActiveGuess();
          setTimeout(() => finishGame(newPicked, true), 600);
          return newPicked;
        }

        // Auto-end only for non-zero clues when all reds found
        if (effectiveTargetCount > 0) {
          const newRedCount = newPicked.filter((i) => board!.cards[i].color === 'red').length;
          if (newRedCount >= effectiveTargetCount) {
            clearActiveGuess();
            setTimeout(() => finishGame(newPicked, false), 400);
            return newPicked;
          }
        }

        // Save in-progress state
        if (clue) saveActiveGuess(clue.id, newPicked);
        return newPicked;
      });
    }, revealDuration);
    setRevealTimers((prev) => ({ ...prev, [index]: timer }));
  }

  const finishGame = useCallback(
    async (finalPicked: number[], isAssassin: boolean) => {
      if (!clue || !board || !user) return;

      clearActiveGuess();
      const computedScore = isAssassin ? 0 : computeGuessScore(finalPicked, board.cards);
      setScore(computedScore);

      // Server computes correctCount and returns targetIndices for reveal
      const result = await api.saveGuessResult({
        clueId: clue.id,
        guessedIndices: finalPicked,
        score: computedScore,
        timestamp: Date.now(),
        userId: user.id,
        boardSize: clue.boardSize,
      });

      setRevealedTargets(result.targetIndices);
      setRevealedNulls(result.nullIndices);

      // Save completed state for back-navigation restoration
      saveCompletedGuess({
        clueId: clue.id,
        pickedIndices: finalPicked,
        score: computedScore,
        targetIndices: result.targetIndices,
        nullIndices: result.nullIndices,
      });

      // Fetch pick percentages for all cards
      api.getClueStats(clue.id).then((s) => {
        if (s.attempts > 0) {
          const pcts: Record<number, number> = {};
          const counts = (s as { pickCounts?: Record<number, number> }).pickCounts || {};
          for (const [idx, cnt] of Object.entries(counts)) {
            pcts[Number(idx)] = Math.round((cnt as number / s.attempts) * 100);
          }
          setPickPercents(pcts);
        }
      });

      runRevealAnimation(finalPicked);
    },
    [clue, board, user],
  );

  function handleEndTurn() {
    // For clue-0: no confirmation (target count unknown)
    // For normal: confirm if not all reds found
    if (clue?.number !== 0 && redPickedCount < effectiveTargetCount && !confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setConfirmEnd(false);
    finishGame(pickedIndices, false);
  }

  function runRevealAnimation(finalPicked: number[]) {
    if (!board) return;

    const unrevealed = board.cards
      .map((_, idx) => idx)
      .filter((idx) => !finalPicked.includes(idx));

    if (!animationEnabled || unrevealed.length === 0) {
      setPhase('done');
      return;
    }

    // Build staggered delay map for CSS transitions
    const delays: Record<number, number> = {};
    unrevealed.forEach((idx, i) => {
      delays[idx] = i * 60;
    });
    setRevealDelays(delays);
    setPhase('revealing');

    // Wait for all reveals to complete then transition to done
    const totalTime = unrevealed.length * 60 + 500;
    setTimeout(() => {
      setPhase('done');
    }, totalTime);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        {t.game.loading}
      </div>
    );
  }

  if (!clue || !board) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4">
        <p>{t.game.clueNotFound}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
        >
          {t.results.backHome}
        </button>
      </div>
    );
  }

  if (clue.userId === user?.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4">
        <p>{t.game.cannotGuessOwn}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
        >
          {t.results.backHome}
        </button>
      </div>
    );
  }

  if (clue.disabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4">
        <p>{t.game.clueDisabled}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/setup')}
            className="px-6 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold transition-colors"
          >
            {t.game.tryAnother}
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
          >
            {t.results.backHome}
          </button>
        </div>
      </div>
    );
  }

  const displayCards: CardState[] = board.cards.map((card, idx) => {
    if (pickedIndices.includes(idx)) return { ...card, revealed: true };
    if (phase === 'done') return { ...card, revealed: true };
    if (phase === 'revealing') return { ...card, revealed: true };
    return card;
  });

  const isPicking = phase === 'picking' && !assassinHit;

  // For done phase: show target markers using revealed data (not from initial clue load)
  const doneTargetIndices = phase === 'done' ? revealedTargets : [];
  const doneNullIndices = phase === 'done' && revealedNulls.length > 0 ? revealedNulls : [];

  return (
    <div className="min-h-screen px-2 sm:px-4 py-4 sm:py-6">
      <GameHeader mode="guessing" config={config} ranked={clue.ranked !== false} />
      <ClueDisplay word={clue.word} number={clue.number} teamColor="red" />

      {colorCounts && phase === 'picking' && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {[
            { key: 'red', bg: 'bg-board-red' },
            { key: 'blue', bg: 'bg-board-blue' },
            { key: 'neutral', bg: 'bg-board-neutral' },
            { key: 'assassin', bg: 'bg-board-assassin border border-gray-600' },
          ].map(({ key, bg }) => (
            <div key={key} className={`w-7 h-7 rounded ${bg} flex items-center justify-center text-white font-bold text-xs`}>
              {colorCounts[key as keyof typeof colorCounts]}
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-gray-400 text-sm mt-3 mb-1">
        {assassinHit
          ? t.game.gameOverAssassin
          : phase === 'done'
            ? t.game.resultsRevealed
            : clue.number === 0
              ? <>{t.game.avoidHintClue0} — <span className="text-board-red">{redPickedCount} / ? {t.game.redFound}</span></>
              : `${t.game.selectWords} — ${redPickedCount} / ${effectiveTargetCount} ${t.game.pickedRedCount}`}
      </p>

      {isPicking && (
        <div className="flex flex-wrap justify-center gap-2 mb-3 mt-2">
          <button
            onClick={handleHome}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors inline-flex items-center gap-1"
          >
            <HomeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.results.backHome}</span>
          </button>
          <button
            onClick={handleAnotherClue}
            disabled={pickedIndices.length > 0}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors inline-flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.game.anotherClue}</span>
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-colors inline-flex items-center"
            title={t.help.title}
          >
            <QuestionMarkCircleIcon className="w-4 h-4" />
          </button>
          <SettingsPanel mode="guessing" />
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowHelp(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <h3 className="text-white font-bold text-lg mb-3">{t.help.scoutTitle}</h3>
            <p className="text-gray-300 text-sm whitespace-pre-line">{t.help.scoutRules}</p>
          </div>
        </div>
      )}

      <Board
        cards={displayCards}
        columns={config.cols}
        showColors={phase === 'done' || phase === 'revealing'}
        selectedIndices={phase === 'done' ? doneTargetIndices : pickedIndices}
        targetIndices={doneTargetIndices}
        nullIndices={doneNullIndices}
        onCardClick={isPicking ? handlePick : undefined}
        disabled={!isPicking}
        pickOrder={viewingAttemptPicks && viewingAttemptPicks.length > 0 ? viewingAttemptPicks : pickedIndices}
        revealDelays={phase === 'revealing' ? revealDelays : undefined}
        highlightTargets={phase === 'done'}
        pickPercents={phase === 'done' ? pickPercents : undefined}
        revealingIndices={revealingIndices.size > 0 ? revealingIndices : undefined}
        revealDuration={revealDuration}
        cardFontSize={user?.preferences.cardFontSize}
      />

      {/* End turn button below board */}
      {isPicking && pickedIndices.length > 0 && (
        <div className="flex flex-col items-center gap-1 mt-3">
          {confirmEnd && (
            <p className="text-amber-400 text-xs">{t.game.confirmEnd}</p>
          )}
          <button
            onClick={handleEndTurn}
            className="px-4 py-1.5 rounded-lg bg-board-red/80 hover:bg-board-red text-white text-sm font-semibold transition-colors"
          >
            {t.game.finish}
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="animate-slide-up">
          <div className="flex justify-center gap-3 mt-4 mb-4">
            <button
              onClick={handleHome}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <HomeIcon className="w-4 h-4" />
              {t.results.backHome}
            </button>
            <button
              onClick={handleAnotherClue}
              className="px-5 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowPathIcon className="w-4 h-4" />
              {t.game.nextPuzzle}
            </button>
          </div>
          {attemptsView ? (
            <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/30 max-w-md mx-auto mt-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">
                  {attemptsView.length} {pluralAttempts(attemptsView.length)}
                </h3>
                <button
                  onClick={() => { setAttemptsView(null); setSelectedAttemptIdx(null); setViewingAttemptPicks(null); }}
                  className="text-gray-400 hover:text-white text-lg leading-none transition-colors"
                >
                  &times;
                </button>
              </div>
              <div className="overflow-y-auto max-h-[200px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="text-gray-500 border-b border-gray-700/50">
                      <th className="text-left py-1 pr-2 font-medium">{t.admin.player}</th>
                      <th className="text-center py-1 px-2 font-medium">{t.results.score}</th>
                      <th className="text-center py-1 pl-2 font-medium">{t.admin.clueDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attemptsView.map((detail, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          if (selectedAttemptIdx === idx) {
                            setSelectedAttemptIdx(null);
                            setViewingAttemptPicks(null);
                          } else {
                            setSelectedAttemptIdx(idx);
                            setViewingAttemptPicks(detail.guessedIndices);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          selectedAttemptIdx === idx
                            ? 'bg-board-blue/20'
                            : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <td className="py-1.5 pr-2 text-left text-gray-300 truncate max-w-[10rem]">
                          {detail.displayName || detail.userId}
                        </td>
                        <td className="py-1.5 px-2 text-center text-white font-semibold">{detail.score}</td>
                        <td className="py-1.5 pl-2 text-center text-gray-500">{formatDate(detail.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <RevealOverlay
              cards={board.cards}
              guessedIndices={pickedIndices}
              targetIndices={revealedTargets}
              score={score}
            />
          )}
          <div className="max-w-md mx-auto mt-4">
            <ClueStatsPanel
              clueId={clue.id}
              spymasterUserId={clue.userDisplayName || clue.userId}
              onShowAttemptPicks={(indices) => setViewingAttemptPicks(indices.length > 0 ? indices : null)}
              onOpenAttempts={(details) => { setAttemptsView(details); setSelectedAttemptIdx(null); setViewingAttemptPicks(null); }}
            />
          </div>
          <ClueRating
            onRate={(rating) => {
              if (user) api.saveRating(clue.id, user.id, rating);
            }}
            onReport={(reason) => { if (user) api.submitReport(clue.id, user.id, reason); }}
          />
        </div>
      )}

      {showHomeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowHomeConfirm(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 text-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowHomeConfirm(false)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <p className="text-white text-sm mb-4">{t.game.confirmHomeGuessing}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowHomeConfirm(false)}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-colors"
              >
                {t.rating.cancel}
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-semibold transition-colors"
              >
                {t.admin.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoClues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-board-bg/90 animate-fade-in" onClick={() => setShowNoClues(false)}>
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center max-w-sm mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowNoClues(false)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <p className="text-white text-lg font-bold mb-2">{t.game.noClues}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-3 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold transition-colors"
            >
              {t.results.backHome}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
