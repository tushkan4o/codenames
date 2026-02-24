import type { BoardConfig, GameMode } from '../../types/game';
import { useTranslation } from '../../i18n/useTranslation';

interface GameHeaderProps {
  mode: GameMode;
  config: BoardConfig;
}

export default function GameHeader({ mode, config }: GameHeaderProps) {
  const { t } = useTranslation();
  const modeLabel = mode === 'clue-giving' ? t.game.spymasterMode : t.game.guesserMode;
  const modeColor = mode === 'clue-giving' ? 'text-blue-400' : 'text-gray-400';

  return (
    <div className="text-center mb-4">
      <h1 className="text-3xl font-bold text-white tracking-tight">CODENAMES</h1>
      <div className="flex items-center justify-center gap-4 mt-1">
        <span className={`text-sm font-semibold ${modeColor}`}>{modeLabel}</span>
        <span className="text-xs text-gray-500">{config.size}</span>
      </div>
    </div>
  );
}
