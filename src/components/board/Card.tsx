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
  nullMarked?: boolean;
  pickOrder?: number;
  revealDelay?: number;
}

const colorConfig: Record<CardColor, { bg: string; text: string; glow: string }> = {
  red: {
    bg: 'bg-board-red',
    text: 'text-gray-900',
    glow: 'shadow-[0_0_18px_rgba(239,83,80,0.5)]',
  },
  blue: {
    bg: 'bg-board-blue',
    text: 'text-gray-900',
    glow: 'shadow-[0_0_18px_rgba(66,165,245,0.5)]',
  },
  neutral: {
    bg: 'bg-board-neutral',
    text: 'text-gray-900',
    glow: '',
  },
  assassin: {
    bg: 'bg-board-assassin',
    text: 'text-gray-400',
    glow: 'shadow-[0_0_12px_rgba(0,0,0,0.6)]',
  },
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
  nullMarked,
  pickOrder,
  revealDelay,
}: CardProps) {
  const shouldShowColor = showColor || revealed;
  const cfg = colorConfig[color];

  const bgClass = shouldShowColor ? cfg.bg : 'bg-board-card';
  const textClass = shouldShowColor ? cfg.text : 'text-gray-200';
  const glowClass = shouldShowColor ? cfg.glow : '';

  const interactiveClass =
    !disabled && onClick ? 'card-interactive cursor-pointer' : '';

  // Selection ring: only in spymaster mode (showColor && !revealed means spymaster view)
  // In guessing mode, revealed cards should not have selection rings
  let ringClass = '';
  if (selected && showColor && !revealed) {
    if (color === 'red') ringClass = 'ring-2 ring-board-red/70 ring-offset-1 ring-offset-board-bg';
    else if (color === 'blue') ringClass = 'ring-2 ring-board-blue/70 ring-offset-1 ring-offset-board-bg';
    else if (color === 'assassin') ringClass = 'ring-2 ring-gray-500/70 ring-offset-1 ring-offset-board-bg';
  }

  // Spymaster target marker: thick white border
  const targetClass = targetMarked
    ? 'ring-[3px] ring-white ring-offset-1 ring-offset-board-bg'
    : '';

  // Null/avoid marker: black fill with thin white edges
  const nullClass = nullMarked
    ? 'ring-[2px] ring-white/60 ring-offset-1 ring-offset-board-bg'
    : '';

  const style = revealDelay !== undefined
    ? { transitionDelay: `${revealDelay}ms` }
    : undefined;

  return (
    <button
      className={`
        card-reveal relative flex items-center justify-center
        aspect-[5/3] rounded-lg font-bold uppercase tracking-wide select-none
        text-[clamp(0.6rem,2.8vw,0.95rem)] p-1 sm:p-2 border border-white/5
        ${bgClass} ${textClass} ${glowClass} ${interactiveClass}
        ${ringClass} ${targetClass} ${nullClass}
      `}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      type="button"
      style={style}
    >
      <span className="text-center leading-tight hyphens-auto" lang="ru" style={{ overflowWrap: 'break-word' }}>{word}</span>

      {pickOrder !== undefined && (
        <span className="absolute bottom-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/80 text-gray-900 text-[0.6rem] sm:text-xs flex items-center justify-center font-bold">
          {pickOrder}
        </span>
      )}
    </button>
  );
}
