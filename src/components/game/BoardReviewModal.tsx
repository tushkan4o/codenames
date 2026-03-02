import { useMemo, useEffect, useState } from 'react';
import { generateBoard } from '../../lib/boardGenerator';
import { BOARD_CONFIGS, BOARD_CONFIG_LEGACY_5x5 } from '../../types/game';
import type { Clue, GuessResult } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import Board from '../board/Board';
import RevealOverlay from './RevealOverlay';
import ClueStatsPanel from './ClueStatsPanel';
import ClueRating from './ClueRating';

interface BoardReviewModalProps {
  clue: Clue;
  result?: GuessResult;
  onClose: () => void;
}

export default function BoardReviewModal({ clue, result, onClose }: BoardReviewModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pickPercents, setPickPercents] = useState<Record<number, number>>({});
  const [viewingAttemptPicks, setViewingAttemptPicks] = useState<number[] | null>(null);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [ratingLoaded, setRatingLoaded] = useState(false);

  const config = useMemo(() => {
    const base = clue.boardSize ? BOARD_CONFIGS[clue.boardSize] : BOARD_CONFIG_LEGACY_5x5;
    if (clue.redCount != null || clue.blueCount != null || clue.assassinCount != null) {
      const redCount = clue.redCount ?? base.redCount;
      const blueCount = clue.blueCount ?? base.blueCount;
      const assassinCount = clue.assassinCount ?? base.assassinCount;
      const neutralCount = base.totalCards - redCount - blueCount - assassinCount;
      return { ...base, redCount, blueCount, assassinCount, neutralCount };
    }
    return base;
  }, [clue]);

  const board = useMemo(
    () => generateBoard(clue.boardSeed, config, clue.wordPack || 'ru'),
    [clue.boardSeed, config, clue.wordPack],
  );

  useEffect(() => {
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
  }, [clue.id]);

  // Fetch existing user rating
  useEffect(() => {
    if (user && clue.userId !== user.id) {
      api.getUserRating(clue.id, user.id).then((r) => {
        setExistingRating(r.rating);
        setRatingLoaded(true);
      }).catch(() => setRatingLoaded(true));
    }
  }, [clue.id, user]);

  const displayCards = board.cards.map((card) => ({ ...card, revealed: true }));
  const guessedIndices = result?.guessedIndices ?? [];

  // Show rating if user is not the clue author
  const showRating = user && clue.userId !== user.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-board-bg overflow-y-auto py-6 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <span className="text-2xl font-extrabold text-white uppercase">{clue.word}</span>
          <span className="ml-3 text-2xl font-extrabold text-white">{clue.number}</span>
          <p className="text-xs text-gray-400 mt-1">
            {clue.boardSize} &middot;{' '}
            {new Date(clue.createdAt).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <Board
          cards={displayCards}
          columns={config.cols}
          showColors={true}
          selectedIndices={clue.targetIndices}
          targetIndices={clue.targetIndices}
          nullIndices={clue.nullIndices || []}
          disabled={true}
          pickOrder={viewingAttemptPicks && viewingAttemptPicks.length > 0 ? viewingAttemptPicks : guessedIndices}
          highlightTargets={true}
          pickPercents={!viewingAttemptPicks || viewingAttemptPicks.length === 0 ? pickPercents : undefined}
        />

        {result && (
          <RevealOverlay
            cards={board.cards}
            guessedIndices={guessedIndices}
            targetIndices={clue.targetIndices}
            score={result.score ?? 0}
          />
        )}

        <div className="mt-4">
          <ClueStatsPanel
            clueId={clue.id}
            spymasterUserId={clue.userId}
            onShowAttemptPicks={(indices) => setViewingAttemptPicks(indices.length > 0 ? indices : null)}
          />
        </div>

        {showRating && ratingLoaded && (
          <div className="mt-4">
            <ClueRating
              initialRating={existingRating}
              onRate={(rating) => api.saveRating(clue.id, user!.id, rating)}
              onReport={(reason) => api.submitReport(clue.id, user!.id, reason)}
            />
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
          >
            {t.results.close}
          </button>
        </div>
      </div>
    </div>
  );
}
