import type { CardColor } from '../../types/game';

interface CardProps {
  word: string;
  color: CardColor;
  revealed: boolean;
  selected: boolean;
  showColor: boolean;
  onClick?: () => void;
  disabled?: boolean;
  targetMarked?: boolean;
  pickOrder?: number;
  flipping?: boolean;
}

const colorClasses: Record<CardColor, string> = {
  red: 'bg-red-600/50 text-white border-red-700/50',
  blue: 'bg-blue-600/50 text-white border-blue-700/50',
  neutral: 'bg-amber-100/40 text-gray-800 border-amber-300/40',
  assassin: 'bg-gray-900/60 text-white border-gray-700/60',
};

export default function Card({
  word,
  color,
  revealed,
  selected,
  showColor,
  onClick,
  disabled,
  targetMarked,
  pickOrder,
  flipping,
}: CardProps) {
  const shouldShowColor = showColor || revealed;

  const baseClasses =
    'relative flex items-center justify-center p-2 rounded-lg font-bold text-sm uppercase tracking-wide select-none min-h-[3.5rem]';

  const colorClass = shouldShowColor
    ? colorClasses[color]
    : 'bg-stone-200 text-gray-900 border-stone-300';

  const interactiveClass =
    !disabled && onClick
      ? 'cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95'
      : '';

  // High-contrast selection frame (skip for neutral cards)
  const selectedClass = selected && shouldShowColor && color !== 'neutral'
    ? 'border-4 border-white shadow-[0_0_12px_rgba(255,255,255,0.5)] scale-105'
    : 'border-2';

  // Master's target words: bright green ring
  const targetClass = targetMarked
    ? 'ring-3 ring-green-400 ring-offset-2 ring-offset-gray-900'
    : '';

  const flipClass = flipping ? 'card-flip' : 'transition-all duration-200';

  return (
    <button
      className={`${baseClasses} ${colorClass} ${interactiveClass} ${selectedClass} ${targetClass} ${flipClass}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      type="button"
    >
      <span className="text-center leading-tight">{word}</span>

      {/* Pick order badge in bottom-left corner */}
      {pickOrder !== undefined && (
        <span className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded-full bg-yellow-400 text-gray-900 text-xs flex items-center justify-center font-bold">
          {pickOrder}
        </span>
      )}
    </button>
  );
}
