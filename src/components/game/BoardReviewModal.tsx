import { useMemo, useEffect, useState } from 'react';
import { generateBoard } from '../../lib/boardGenerator';
import { BOARD_CONFIGS, BOARD_CONFIG_LEGACY_5x5 } from '../../types/game';
import type { Clue, GuessResult } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import Board from '../board/Board';
import RevealOverlay from './RevealOverlay';
import ClueStatsPanel, { type AttemptDetail, pluralAttempts } from './ClueStatsPanel';
import ClueRating from './ClueRating';
import { useProfileModal } from '../../context/ProfileModalContext';

interface BoardReviewModalProps {
  clue: Clue;
  result?: GuessResult;
  onClose: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BoardReviewModal({ clue, result, onClose }: BoardReviewModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openProfile } = useProfileModal();
  const [pickPercents, setPickPercents] = useState<Record<number, number>>({});
  const [viewingAttemptPicks, setViewingAttemptPicks] = useState<number[] | null>(null);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [ratingLoaded, setRatingLoaded] = useState(false);
  const [attemptsView, setAttemptsView] = useState<AttemptDetail[] | null>(null);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number | null>(null);
  const [attemptSort, setAttemptSort] = useState<'timestamp' | 'score' | null>('timestamp');
  const [attemptDir, setAttemptDir] = useState<'asc' | 'desc'>('asc');

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
        className="w-full max-w-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X close button */}
        <button
          onClick={onClose}
          className="absolute -top-1 -right-1 sm:right-0 text-gray-500 hover:text-white text-2xl leading-none transition-colors z-10 p-1"
        >
          &times;
        </button>

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
          pickPercents={pickPercents}
        />

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
                    <th
                      className="text-center py-1 px-2 font-medium cursor-pointer select-none hover:text-gray-300 transition-colors"
                      onClick={() => {
                        if (attemptSort === 'score') {
                          if (attemptDir === 'desc') setAttemptDir('asc');
                          else { setAttemptSort(null); setAttemptDir('desc'); }
                        } else { setAttemptSort('score'); setAttemptDir('desc'); }
                        setSelectedAttemptIdx(null); setViewingAttemptPicks(null);
                      }}
                    >
                      {t.results.score}
                      <span className="ml-0.5 text-[0.5em]">{attemptSort === 'score' ? (attemptDir === 'desc' ? '\u25BC' : '\u25B2') : ''}</span>
                    </th>
                    <th
                      className="text-center py-1 pl-2 font-medium cursor-pointer select-none hover:text-gray-300 transition-colors"
                      onClick={() => {
                        if (attemptSort === 'timestamp') {
                          if (attemptDir === 'asc') setAttemptDir('desc');
                          else { setAttemptSort(null); setAttemptDir('desc'); }
                        } else { setAttemptSort('timestamp'); setAttemptDir('asc'); }
                        setSelectedAttemptIdx(null); setViewingAttemptPicks(null);
                      }}
                    >
                      {t.admin.clueDate}
                      <span className="ml-0.5 text-[0.5em]">{attemptSort === 'timestamp' ? (attemptDir === 'desc' ? '\u25BC' : '\u25B2') : ''}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(attemptSort ? [...attemptsView].sort((a, b) => {
                    const key = attemptSort;
                    const mul = attemptDir === 'asc' ? 1 : -1;
                    return mul * (a[key] - b[key]);
                  }) : attemptsView).map((detail, idx) => (
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
                      <td className="py-1.5 pr-2 text-left">
                        <button
                          onClick={(e) => { e.stopPropagation(); openProfile(detail.userId); }}
                          className="text-blue-400 hover:text-blue-300 transition-colors truncate max-w-[10rem] block text-left"
                        >
                          {detail.userId}
                        </button>
                      </td>
                      <td className="py-1.5 px-2 text-center text-white font-semibold">{detail.score}</td>
                      <td className="py-1.5 pl-2 text-center text-gray-500">{formatDate(detail.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : result ? (
          <RevealOverlay
            cards={board.cards}
            guessedIndices={guessedIndices}
            targetIndices={clue.targetIndices}
            score={result.score ?? 0}
          />
        ) : null}

        <div className="max-w-md mx-auto mt-4">
          <ClueStatsPanel
            clueId={clue.id}
            spymasterUserId={clue.userId}
            onShowAttemptPicks={(indices) => setViewingAttemptPicks(indices.length > 0 ? indices : null)}
            onOpenAttempts={(details) => { setAttemptsView(details); setSelectedAttemptIdx(null); setViewingAttemptPicks(null); }}
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
