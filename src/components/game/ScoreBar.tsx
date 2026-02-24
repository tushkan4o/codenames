import type { BoardConfig, CardState } from '../../types/game';

interface ScoreBarProps {
  cards: CardState[];
  startingTeam: 'red' | 'blue';
  config: BoardConfig;
}

export default function ScoreBar({ cards, startingTeam, config }: ScoreBarProps) {
  const redCount = cards.filter((c) => c.color === 'red' && !c.revealed).length;
  const blueCount = cards.filter((c) => c.color === 'blue' && !c.revealed).length;

  const redTotal = startingTeam === 'red' ? config.redCount : config.blueCount;
  const blueTotal = startingTeam === 'blue' ? config.redCount : config.blueCount;

  return (
    <div className="flex items-center justify-center gap-6 mb-4">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-red-600" />
        <span className={`font-bold ${startingTeam === 'red' ? 'text-red-400' : 'text-red-500'}`}>
          {redCount}
        </span>
      </div>
      <span className="text-gray-500">vs</span>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-blue-600" />
        <span className={`font-bold ${startingTeam === 'blue' ? 'text-blue-400' : 'text-blue-500'}`}>
          {blueCount}
        </span>
      </div>
      <span className="text-xs text-gray-500 ml-2">
        {startingTeam === 'red' ? 'Red' : 'Blue'} starts ({redTotal} / {blueTotal})
      </span>
    </div>
  );
}
