import type { BoardConfig, GameMode } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';

interface GameHeaderProps {
  mode: GameMode;
  config: BoardConfig;
  ranked?: boolean;
}

export default function GameHeader({ mode, config, ranked }: GameHeaderProps) {
  const { t } = useTranslation();
  const modeLabel = mode === 'clue-giving' ? t.game.spymasterMode : t.game.guesserMode;
  const modeColor = mode === 'clue-giving' ? 'text-board-blue' : 'text-gray-400';

  const isRanked = ranked === true;
  const badgeTitle = isRanked ? t.setup.rankedDesc : ranked === false ? t.setup.casualDesc : '';

  return (
    <div className="text-center mb-3">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">CODENAMES</h1>
      <div className="flex items-center justify-center gap-3 mt-0.5">
        <span className={`text-sm font-semibold ${modeColor}`}>{modeLabel}</span>
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
      </div>
    </div>
  );
}
