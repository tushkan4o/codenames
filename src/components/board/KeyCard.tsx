import type { CardState } from '../../types/game';

interface KeyCardProps {
  cards: CardState[];
  columns: number;
}

const miniColorMap = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  neutral: 'bg-amber-200',
  assassin: 'bg-gray-900',
};

const gridColsClass: Record<number, string> = {
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

export default function KeyCard({ cards, columns }: KeyCardProps) {
  return (
    <div className={`inline-grid ${gridColsClass[columns] || 'grid-cols-5'} gap-0.5 p-2 bg-gray-800 rounded-lg`}>
      {cards.map((card, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-sm ${miniColorMap[card.color]}`}
          title={card.word}
        />
      ))}
    </div>
  );
}
