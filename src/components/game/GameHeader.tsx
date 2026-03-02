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

  return (
    <div className="text-center mb-3">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">CODENAMES</h1>
      <div className="flex items-center justify-center gap-4 mt-0.5">
        <span className={`text-sm font-semibold ${modeColor}`}>{modeLabel}</span>
        <span className="text-xs text-gray-500 inline-flex items-center gap-1">
          {config.size}
          {ranked !== undefined && (
            <span
              className={ranked ? 'text-amber-400' : 'text-gray-600'}
              title={ranked ? t.setup.rankedDesc : t.setup.casualDesc}
            >
              {ranked ? '★' : '☆'}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
