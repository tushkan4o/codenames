import type { CardState } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';

interface RevealOverlayProps {
  cards: CardState[];
  guessedIndices: number[];
  targetIndices: number[];
  score: number;
  onClose: () => void;
}

export default function RevealOverlay({
  cards,
  guessedIndices,
  targetIndices,
  score,
  onClose,
}: RevealOverlayProps) {
  const { t } = useTranslation();

  const pickedRedClued = guessedIndices.filter(
    (i) => cards[i].color === 'red' && targetIndices.includes(i),
  );
  const pickedRedUnclued = guessedIndices.filter(
    (i) => cards[i].color === 'red' && !targetIndices.includes(i),
  );
  const missedClued = targetIndices.filter((i) => !guessedIndices.includes(i));
  const pickedWrong = guessedIndices.filter((i) => cards[i].color !== 'red');

  return (
    <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/30 max-w-md mx-auto mt-4 backdrop-blur-sm">
      <div className="text-center mb-4">
        <p className="text-gray-500 text-xs uppercase tracking-wider">{t.results.score}</p>
        <span className="text-4xl font-extrabold text-white">{score}</span>
      </div>

      <div className="space-y-2 text-sm">
        {pickedRedClued.length > 0 && (
          <div className="flex gap-2">
            <span className="text-board-blue font-semibold whitespace-nowrap">{t.results.pickedRedClued}:</span>
            <span className="text-gray-300">
              {pickedRedClued.map((i) => cards[i].word).join(', ')}
            </span>
          </div>
        )}
        {pickedRedUnclued.length > 0 && (
          <div className="flex gap-2">
            <span className="text-board-red font-semibold whitespace-nowrap">{t.results.pickedRedUnclued}:</span>
            <span className="text-gray-300">
              {pickedRedUnclued.map((i) => cards[i].word).join(', ')}
            </span>
          </div>
        )}
        {missedClued.length > 0 && (
          <div className="flex gap-2">
            <span className="text-gray-500 font-semibold whitespace-nowrap">{t.results.missedClued}:</span>
            <span className="text-gray-400">
              {missedClued.map((i) => cards[i].word).join(', ')}
            </span>
          </div>
        )}
        {pickedWrong.length > 0 && (
          <div className="flex gap-2">
            <span className="text-amber-400 font-semibold whitespace-nowrap">{t.results.pickedWrong}:</span>
            <span className="text-gray-300">
              {pickedWrong.map((i) => cards[i].word).join(', ')}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="mt-4 w-full py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-semibold transition-colors text-sm"
      >
        {t.results.backHome}
      </button>
    </div>
  );
}
