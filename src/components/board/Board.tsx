import type { CardState } from '../../types/game';
import type { CardFontSize } from '../../types/user';
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
  highlightTargets?: boolean;
  pickPercents?: Record<number, number>;
  cardFontSize?: CardFontSize;
  revealingIndices?: Set<number>;
  revealDuration?: number;
  // Drag-and-drop support
  displayOrder?: number[];
  draggingOrigIdx?: number | null;
  onPointerDown?: (visualIdx: number, e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => boolean;
  registerCardRef?: (visualIdx: number, el: HTMLElement | null) => void;
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
  highlightTargets,
  pickPercents,
  cardFontSize,
  revealingIndices,
  revealDuration,
  displayOrder,
  draggingOrigIdx,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  registerCardRef,
}: BoardProps) {
  const targetSet = highlightTargets ? new Set(targetIndices) : null;
  const nullSet = highlightTargets ? new Set(nullIndices) : null;
  const hasHighlight = targetSet && (targetSet.size > 0 || (nullSet && nullSet.size > 0));

  const isDragEnabled = !!displayOrder;

  return (
    <div
      className={`grid ${gridColsClass[columns] || 'grid-cols-5'} gap-1 sm:gap-1.5 lg:gap-2 w-full max-w-[min(100%,750px)] lg:max-w-[min(100%,820px)] mx-auto px-1`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {cards.map((_card, visualIdx) => {
        const originalIndex = displayOrder ? displayOrder[visualIdx] : visualIdx;
        const card = cards[originalIndex];
        if (!card) return null;

        const orderIdx = pickOrder?.indexOf(originalIndex);
        const order = orderIdx !== undefined && orderIdx >= 0 ? orderIdx + 1 : undefined;

        const isTarget = targetSet?.has(originalIndex);
        const isNull = nullSet?.has(originalIndex);
        const isHighlighted = isTarget || isNull;

        const isDragged = draggingOrigIdx === originalIndex;

        if (!isDragEnabled) {
          return (
            <Card
              key={originalIndex}
              word={card.word}
              color={card.color}
              revealed={card.revealed}
              selected={selectedIndices.includes(originalIndex)}
              showColor={showColors}
              onClick={onCardClick ? () => onCardClick(originalIndex) : undefined}
              disabled={disabled}
              targetMarked={!highlightTargets && targetIndices.includes(originalIndex)}
              nullMarked={nullIndices.includes(originalIndex)}
              dimmed={hasHighlight ? !isHighlighted : false}
              glowing={hasHighlight ? !!isTarget : false}
              pickPercent={pickPercents?.[originalIndex]}
              pickOrder={order}
              revealDelay={revealDelays?.[originalIndex]}
              fontSize={cardFontSize}
              revealing={revealingIndices?.has(originalIndex)}
              revealDuration={revealDuration}
              cardIndex={originalIndex}
            />
          );
        }

        return (
          <div
            key={originalIndex}
            className="min-w-0"
            data-visual-index={visualIdx}
            ref={(el) => registerCardRef?.(visualIdx, el)}
            style={{ touchAction: 'none', opacity: isDragged ? 0.3 : 1 }}
            onPointerDown={(e) => onPointerDown?.(visualIdx, e)}
          >
            <Card
              word={card.word}
              color={card.color}
              revealed={card.revealed}
              selected={selectedIndices.includes(originalIndex)}
              showColor={showColors}
              disabled={disabled}
              targetMarked={!highlightTargets && targetIndices.includes(originalIndex)}
              nullMarked={nullIndices.includes(originalIndex)}
              dimmed={hasHighlight ? !isHighlighted : false}
              glowing={hasHighlight ? !!isTarget : false}
              pickPercent={pickPercents?.[originalIndex]}
              pickOrder={order}
              revealDelay={revealDelays?.[originalIndex]}
              fontSize={cardFontSize}
              revealing={revealingIndices?.has(originalIndex)}
              revealDuration={revealDuration}
              cardIndex={originalIndex}
            />
          </div>
        );
      })}
    </div>
  );
}
