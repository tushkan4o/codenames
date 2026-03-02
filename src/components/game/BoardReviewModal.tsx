import { useMemo } from 'react';
import { generateBoard } from '../../lib/boardGenerator';
import { BOARD_CONFIGS, BOARD_CONFIG_LEGACY_5x5 } from '../../types/game';
import type { Clue, GuessResult } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';
import Board from '../board/Board';
import RevealOverlay from './RevealOverlay';
import ClueStatsPanel from './ClueStatsPanel';

interface BoardReviewModalProps {
  clue: Clue;
  result?: GuessResult;
  onClose: () => void;
}

export default function BoardReviewModal({ clue, result, onClose }: BoardReviewModalProps) {
  const { t } = useTranslation();

  const config = clue.boardSize ? BOARD_CONFIGS[clue.boardSize] : BOARD_CONFIG_LEGACY_5x5;

  const board = useMemo(
    () => generateBoard(clue.boardSeed, config, clue.wordPack || 'ru'),
    [clue.boardSeed, config, clue.wordPack],
  );

  const displayCards = board.cards.map((card) => ({ ...card, revealed: true }));
  const guessedIndices = result?.guessedIndices ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-board-bg/95 overflow-y-auto py-6 px-4"
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
          pickOrder={guessedIndices}
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
          <ClueStatsPanel clueId={clue.id} spymasterUserId={clue.userId} />
        </div>

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
