import { useTranslation } from '../../i18n/useTranslation';

interface ClueDisplayProps {
  word: string;
  number: number;
  nullCount?: number;
}

export default function ClueDisplay({ word, number, nullCount }: ClueDisplayProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-1 justify-center">
      <div className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gray-800/80 rounded-xl border border-gray-700/50">
        <span className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-wider">
          {word}
        </span>
        <span className="ml-3 text-xl sm:text-2xl font-extrabold text-white">{number}</span>
      </div>
      {number === 0 && nullCount !== undefined && nullCount > 0 && (
        <p className="text-amber-400 text-xs">
          {t.game.avoidHint.replace('{n}', String(nullCount))}
        </p>
      )}
    </div>
  );
}
