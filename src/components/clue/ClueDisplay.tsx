interface ClueDisplayProps {
  word: string;
  number: number;
}

export default function ClueDisplay({ word, number }: ClueDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1 justify-center">
      <div className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gray-800/80 rounded-xl border border-gray-700/50">
        <span className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-wider">
          {word}
        </span>
        <span className="ml-3 text-xl sm:text-2xl font-extrabold text-white">{number}</span>
      </div>
    </div>
  );
}
