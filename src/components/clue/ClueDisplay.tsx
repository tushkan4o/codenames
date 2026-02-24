interface ClueDisplayProps {
  word: string;
  number: number;
}

export default function ClueDisplay({ word, number }: ClueDisplayProps) {
  return (
    <div className="flex items-center gap-3 justify-center">
      <div className="px-6 py-3 bg-gray-800 rounded-xl border border-gray-600">
        <span className="text-2xl font-bold text-white uppercase tracking-wider">
          {word}
        </span>
        <span className="ml-3 text-2xl font-bold text-yellow-400">{number}</span>
      </div>
    </div>
  );
}
