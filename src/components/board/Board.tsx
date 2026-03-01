import type { CardState } from '../../types/game';
import Card from './Card';

interface BoardProps {
  cards: CardState[];
  columns: number;
  showColors: boolean;
  selectedIndices: number[];
  targetIndices?: number[];
  nullIndices?: number[];
  onCardClick?: (index: number) => void;
  disabled?: boolean;
  pickOrder?: number[];
  revealDelays?: Record<number, number>;
}

const gridColsClass: Record<number, string> = {
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

export default function Board({
  cards,
  columns,
  showColors,
  selectedIndices,
  targetIndices = [],
  nullIndices = [],
  onCardClick,
  disabled,
  pickOrder,
  revealDelays,
}: BoardProps) {
  return (
    <div className={`grid ${gridColsClass[columns] || 'grid-cols-5'} gap-1 sm:gap-1.5 w-full max-w-[min(100%,780px)] mx-auto px-1`}>
      {cards.map((card, index) => {
        const orderIdx = pickOrder?.indexOf(index);
        const order = orderIdx !== undefined && orderIdx >= 0 ? orderIdx + 1 : undefined;

        return (
          <Card
            key={index}
            word={card.word}
            color={card.color}
            revealed={card.revealed}
            selected={selectedIndices.includes(index)}
            showColor={showColors}
            onClick={onCardClick ? () => onCardClick(index) : undefined}
            disabled={disabled}
            targetMarked={targetIndices.includes(index)}
            nullMarked={nullIndices.includes(index)}
            pickOrder={order}
            revealDelay={revealDelays?.[index]}
          />
        );
      })}
    </div>
  );
}
