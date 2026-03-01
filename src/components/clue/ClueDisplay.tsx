interface ClueDisplayProps {
  word: string;
  number: number;
  teamColor?: 'red' | 'blue';
}

export default function ClueDisplay({ word, number, teamColor }: ClueDisplayProps) {
  const borderClass = teamColor === 'red'
    ? 'border-board-red/60 bg-board-red/10'
    : teamColor === 'blue'
      ? 'border-board-blue/60 bg-board-blue/10'
      : 'border-gray-700/50 bg-gray-800/80';
  const textClass = teamColor === 'red'
    ? 'text-board-red'
    : teamColor === 'blue'
      ? 'text-board-blue'
      : 'text-white';

  return (
    <div className="flex flex-col items-center gap-1 justify-center">
      <div className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl border ${borderClass}`}>
        <span className={`text-xl sm:text-2xl font-extrabold uppercase tracking-wider ${textClass}`}>
          {word}
        </span>
        <span className={`ml-3 text-xl sm:text-2xl font-extrabold ${textClass}`}>{number}</span>
      </div>
    </div>
  );
}
