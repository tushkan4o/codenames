import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateBoard } from '../lib/boardGenerator';
import { computeGuessScore } from '../lib/scoring';
import { mockApi } from '../mock/mockApi';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { BOARD_CONFIGS, BOARD_CONFIG_LEGACY_5x5 } from '../types/game';
import type { Clue, CardState } from '../types/game';
import Board from '../components/board/Board';
import GameHeader from '../components/game/GameHeader';
import ClueDisplay from '../components/clue/ClueDisplay';
import RevealOverlay from '../components/game/RevealOverlay';
import ClueRating from '../components/game/ClueRating';

type GamePhase = 'picking' | 'revealing' | 'done';

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
  const [revealStep, setRevealStep] = useState(-1);

  useEffect(() => {
    async function loadClue() {
      if (!clueId) return;
      const found = await mockApi.getClueById(clueId);
      setClue(found);
      setLoading(false);
    }
    loadClue();
  }, [clueId]);

  const config = useMemo(() => {
    if (!clue) return BOARD_CONFIGS['5x5'];
    if (clue.boardSize) return BOARD_CONFIGS[clue.boardSize];
    return BOARD_CONFIG_LEGACY_5x5;
  }, [clue]);

  const board = useMemo(() => {
    if (!clue) return null;
    return generateBoard(clue.boardSeed, config, clue.wordPack || 'en');
  }, [clue, config]);

  const animationEnabled = user?.preferences.animationEnabled ?? true;

  // Count how many red cards the guesser has found
  const redPickedCount = useMemo(() => {
    if (!board) return 0;
    return pickedIndices.filter((i) => board.cards[i].color === 'red').length;
  }, [pickedIndices, board]);

  function handleHome() {
    navigate('/');
  }

  async function handleAnotherClue() {
    if (!user) return;
    const newClue = await mockApi.getRandomClue(user.id, clue ? [clue.id] : []);
    if (newClue) {
      navigate(`/guess/${newClue.id}`);
    } else {
      alert(t.game.noClues);
    }
  }

  function handlePick(index: number) {
    if (phase !== 'picking' || !board || !clue) return;
    if (pickedIndices.includes(index)) return; // already picked

    const newPicked = [...pickedIndices, index];
    setPickedIndices(newPicked);

    const card = board.cards[index];

    // Assassin → immediate game over
    if (card.color === 'assassin') {
      setAssassinHit(true);
      setScore(0);
      // Short delay then reveal all
      setTimeout(() => finishGame(newPicked, true), 600);
      return;
    }

    // Check if found enough red words
    const newRedCount = newPicked.filter((i) => board.cards[i].color === 'red').length;
    if (newRedCount >= clue.number) {
      // Auto-finish: found all target reds
      setTimeout(() => finishGame(newPicked, false), 400);
    }
  }

  const finishGame = useCallback(
    async (finalPicked: number[], isAssassin: boolean) => {
      if (!clue || !board || !user) return;

      const computedScore = isAssassin ? 0 : computeGuessScore(finalPicked, board.cards);
      setScore(computedScore);

      const correctCount = finalPicked.filter((i) => clue.targetIndices.includes(i)).length;

      await mockApi.saveGuessResult({
        clueId: clue.id,
        guessedIndices: finalPicked,
        correctCount,
        totalTargets: clue.targetIndices.length,
        score: computedScore,
        timestamp: Date.now(),
        userId: user.id,
      });

      // Reveal remaining cards
      runRevealAnimation(finalPicked);
    },
    [clue, board, user],
  );

  function handleEndTurn() {
    finishGame(pickedIndices, false);
  }

  function runRevealAnimation(finalPicked: number[]) {
    if (!board) return;

    // Find unrevealed indices (not picked)
    const unrevealed = board.cards
      .map((_, idx) => idx)
      .filter((idx) => !finalPicked.includes(idx));

    if (!animationEnabled || unrevealed.length === 0) {
      setPhase('done');
      return;
    }

    setPhase('revealing');
    let step = 0;
    setRevealStep(0);
    const interval = setInterval(() => {
      step++;
      if (step >= unrevealed.length) {
        clearInterval(interval);
        setTimeout(() => {
          setRevealStep(-1);
          setPhase('done');
        }, 200);
      } else {
        setRevealStep(step);
      }
    }, 50); // fast reveal for remaining cards
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
          {t.game.home}
        </button>
      </div>
    );
  }

  // Build display cards: picked cards are always revealed, others revealed only during reveal phase or done
  const unrevealedIndices = board.cards
    .map((_, idx) => idx)
    .filter((idx) => !pickedIndices.includes(idx));

  const displayCards: CardState[] = board.cards.map((card, idx) => {
    // Picked cards are always revealed
    if (pickedIndices.includes(idx)) return { ...card, revealed: true };
    // Done = all revealed
    if (phase === 'done') return { ...card, revealed: true };
    // During reveal animation: reveal unrevealed cards up to current step
    if (phase === 'revealing' && revealStep >= 0) {
      const revealedSoFar = unrevealedIndices.slice(0, revealStep + 1);
      if (revealedSoFar.includes(idx)) return { ...card, revealed: true };
    }
    return card;
  });

  const currentFlippingIndex =
    phase === 'revealing' && revealStep >= 0 ? unrevealedIndices[revealStep] : undefined;

  const isPicking = phase === 'picking' && !assassinHit;

  return (
    <div className="min-h-screen px-4 py-6">
      <GameHeader mode="guessing" config={config} />
      <ClueDisplay word={clue.word} number={clue.number} />

      <p className="text-center text-gray-400 text-sm mt-3 mb-1">
        {assassinHit
          ? t.game.gameOverAssassin
          : phase === 'done'
            ? t.game.resultsRevealed
            : `${t.game.selectWords} — ${redPickedCount} / ${clue.number} ${t.game.pickedRedCount}`}
      </p>

      {/* Action buttons */}
      {isPicking && (
        <div className="flex justify-center gap-3 mb-4 mt-2">
          <button
            onClick={handleHome}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition-colors"
          >
            {t.game.home}
          </button>
          <button
            onClick={handleAnotherClue}
            className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-bold transition-colors"
          >
            {t.game.anotherClue}
          </button>
          {pickedIndices.length > 0 && (
            <button
              onClick={handleEndTurn}
              className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold transition-colors"
            >
              {t.game.endTurn}
            </button>
          )}
        </div>
      )}

      <Board
        cards={displayCards}
        columns={config.cols}
        showColors={phase === 'done' || phase === 'revealing'}
        selectedIndices={phase === 'done' ? clue.targetIndices : pickedIndices}
        targetIndices={[]}
        onCardClick={isPicking ? handlePick : undefined}
        disabled={!isPicking}
        pickOrder={pickedIndices}
        flippingIndex={currentFlippingIndex}
      />

      {phase === 'done' && (
        <>
          <RevealOverlay
            cards={board.cards}
            guessedIndices={pickedIndices}
            targetIndices={clue.targetIndices}
            score={score}
            onClose={() => navigate('/')}
          />
          <ClueRating
            onRate={(rating) => {
              if (user) mockApi.saveRating(clue.id, user.id, rating);
            }}
            onReport={(reason) => console.log('Reported:', reason)}
          />
        </>
      )}
    </div>
  );
}
