import type { CardState, CardColor } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';

interface RevealOverlayProps {
  cards: CardState[];
  guessedIndices: number[];
  targetIndices: number[];
  score: number;
  compact?: boolean;
}

const colorClassMap: Record<CardColor, string> = {
  red: 'text-board-red',
  blue: 'text-board-blue',
  neutral: 'text-white',
  assassin: 'text-gray-500',
};

function ColoredWords({ indices, cards }: { indices: number[]; cards: CardState[] }) {
  return (
    <span>
      {indices.map((idx, i) => (
        <span key={idx}>
          {i > 0 && ', '}
          <span className={colorClassMap[cards[idx].color]}>{cards[idx].word}</span>
        </span>
      ))}
    </span>
  );
}

export default function RevealOverlay({
  cards,
  guessedIndices,
  targetIndices,
  score,
  compact,
}: RevealOverlayProps) {
  const { t } = useTranslation();

  // Угаданные: picked red that were in targets
  const pickedRedClued = guessedIndices.filter(
    (i) => cards[i].color === 'red' && targetIndices.includes(i),
  );
  // Зарандомленные: picked red that were NOT in targets (random reds)
  const pickedRedUnclued = guessedIndices.filter(
    (i) => cards[i].color === 'red' && !targetIndices.includes(i),
  );
  // Пропущенные: targets that were not picked
  const missedClued = targetIndices.filter((i) => !guessedIndices.includes(i));
  // Неправильные: picked non-red cards
  const pickedWrong = guessedIndices.filter((i) => cards[i].color !== 'red');

  // Compact mode: just the word grid, no wrapper/score (used inside ResultsTabs)
  if (compact) {
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {pickedRedClued.length > 0 && (
          <>
            <span className="text-gray-400 font-semibold whitespace-nowrap text-right">{t.results.pickedRedClued}:</span>
            <ColoredWords indices={pickedRedClued} cards={cards} />
          </>
        )}
        {pickedRedUnclued.length > 0 && (
          <>
            <span className="text-gray-400 font-semibold whitespace-nowrap text-right">{t.results.pickedRedUnclued}:</span>
            <ColoredWords indices={pickedRedUnclued} cards={cards} />
          </>
        )}
        {missedClued.length > 0 && (
          <>
            <span className="text-gray-400 font-semibold whitespace-nowrap text-right">{t.results.missedClued}:</span>
            <ColoredWords indices={missedClued} cards={cards} />
          </>
        )}
        {pickedWrong.length > 0 && (
          <>
            <span className="text-gray-400 font-semibold whitespace-nowrap text-right">{t.results.pickedWrong}:</span>
            <ColoredWords indices={pickedWrong} cards={cards} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/30 max-w-md mx-auto mt-4 backdrop-blur-sm">
      <div className="text-center mb-4">
        <p className="text-gray-500 text-xs uppercase tracking-wider">{t.results.score}</p>
        <span className="text-4xl font-extrabold text-white">{score}</span>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
        {pickedRedClued.length > 0 && (
          <>
            <span className="text-gray-400 font-semibold whitespace-nowrap text-right">{t.results.pickedRedClued}:</span>
            <ColoredWords indices={pickedRedClued} cards={cards} />
          </>
        )}
        {pickedRedUnclued.length > 0 && (
          <>
            <span className="text-gray-400 font-semibold whitespace-nowrap text-right">{t.results.pickedRedUnclued}:</span>
            <ColoredWords indices={pickedRedUnclued} cards={cards} />
          </>
        )}
        {missedClued.length > 0 && (
          <>
            <span className="text-gray-400 font-semibold whitespace-nowrap text-right">{t.results.missedClued}:</span>
            <ColoredWords indices={missedClued} cards={cards} />
          </>
        )}
        {pickedWrong.length > 0 && (
          <>
            <span className="text-gray-400 font-semibold whitespace-nowrap text-right">{t.results.pickedWrong}:</span>
            <ColoredWords indices={pickedWrong} cards={cards} />
          </>
        )}
      </div>
    </div>
  );
}
