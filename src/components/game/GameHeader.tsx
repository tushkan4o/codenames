import type { BoardConfig, GameMode } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';

interface ColorCounts {
  red: number;
  blue: number;
  neutral: number;
  assassin: number;
}

interface GameHeaderProps {
  mode: GameMode;
  config: BoardConfig;
  ranked?: boolean;
  colorCounts?: ColorCounts | null;
}

export default function GameHeader({ mode, config, ranked, colorCounts }: GameHeaderProps) {
  const { t } = useTranslation();
  const modeLabel = mode === 'clue-giving' ? t.game.spymasterMode : t.game.guesserMode;

  const isRanked = ranked === true;
  const badgeTitle = isRanked ? t.setup.rankedDesc : ranked === false ? t.setup.casualDesc : '';

  return (
    <div className="text-center mb-3">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">CODENAMES</h1>
      <div className="flex items-center justify-center gap-3 mt-0.5">
        <span className="text-sm font-semibold text-gray-400">{modeLabel}</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${
            isRanked
              ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
              : 'bg-gray-700/50 text-gray-400 border-gray-600/30'
          }`}
          title={badgeTitle}
        >
          {config.size}
          {ranked !== undefined && (
            <span>{isRanked ? '★' : '☆'}</span>
          )}
        </span>
        {colorCounts && (
          <div className="flex items-center gap-1">
            {[
              { key: 'red', bg: 'bg-board-red' },
              { key: 'blue', bg: 'bg-board-blue' },
              { key: 'neutral', bg: 'bg-board-neutral' },
              { key: 'assassin', bg: 'bg-board-assassin border border-gray-600' },
            ].map(({ key, bg }) => {
              const count = colorCounts[key as keyof ColorCounts];
              if (count === 0) return null;
              return (
                <div key={key} className={`w-6 h-6 rounded ${bg} flex items-center justify-center text-white font-bold text-[0.65rem]`}>
                  {count}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
