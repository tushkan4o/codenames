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

  // Red picked that were clued by master
  const pickedRedClued = guessedIndices.filter(
    (i) => cards[i].color === 'red' && targetIndices.includes(i),
  );
  // Red picked that were NOT clued by master
  const pickedRedUnclued = guessedIndices.filter(
    (i) => cards[i].color === 'red' && !targetIndices.includes(i),
  );
  // Clued by master but not picked by guesser
  const missedClued = targetIndices.filter((i) => !guessedIndices.includes(i));
  // Picked but not red (blue, neutral, assassin)
  const pickedWrong = guessedIndices.filter((i) => cards[i].color !== 'red');

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-md mx-auto mt-4">
      <h2 className="text-xl font-bold text-white mb-4 text-center">{t.results.title}</h2>

      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">{t.results.score}</p>
        <span className="text-4xl font-bold text-yellow-400">{score}</span>
      </div>

      <div className="space-y-3 text-sm">
        {pickedRedClued.length > 0 && (
          <div>
            <span className="text-green-400 font-semibold">{t.results.pickedRedClued}: </span>
            <span className="text-gray-300">
              {pickedRedClued.map((i) => cards[i].word).join(', ')}
            </span>
          </div>
        )}
        {pickedRedUnclued.length > 0 && (
          <div>
            <span className="text-red-400 font-semibold">{t.results.pickedRedUnclued}: </span>
            <span className="text-gray-300">
              {pickedRedUnclued.map((i) => cards[i].word).join(', ')}
            </span>
          </div>
        )}
        {missedClued.length > 0 && (
          <div>
            <span className="text-amber-400 font-semibold">{t.results.missedClued}: </span>
            <span className="text-gray-300">
              {missedClued.map((i) => cards[i].word).join(', ')}
            </span>
          </div>
        )}
        {pickedWrong.length > 0 && (
          <div>
            <span className="text-blue-400 font-semibold">{t.results.pickedWrong}: </span>
            <span className="text-gray-300">
              {pickedWrong.map((i) => cards[i].word).join(', ')}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="mt-4 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
      >
        {t.results.backHome}
      </button>
    </div>
  );
}
