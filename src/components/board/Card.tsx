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
  dimmed?: boolean;
  glowing?: boolean;
  pickPercent?: number;
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

const glowColors: Record<CardColor, string> = {
  red: 'shadow-[0_0_12px_3px_rgba(239,83,80,0.45)]',
  blue: 'shadow-[0_0_12px_3px_rgba(66,165,245,0.45)]',
  neutral: 'shadow-[0_0_8px_2px_rgba(255,255,255,0.15)]',
  assassin: 'shadow-[0_0_8px_2px_rgba(0,0,0,0.4)]',
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
  dimmed,
  glowing,
  pickPercent,
  pickOrder,
  revealDelay,
}: CardProps) {
  const shouldShowColor = showColor || revealed;
  const cfg = colorConfig[color];

  const bgClass = shouldShowColor ? cfg.bg : 'bg-board-card';
  const textClass = shouldShowColor ? cfg.text : 'text-gray-200';
  const glowClass = shouldShowColor && !glowing ? cfg.glow : '';

  const interactiveClass =
    !disabled && onClick ? 'card-interactive cursor-pointer' : '';

  // Selection ring: only in spymaster mode (showColor && !revealed means spymaster view)
  let ringClass = '';
  if (selected && showColor && !revealed) {
    if (color === 'red') ringClass = 'ring-2 ring-board-red/70 ring-offset-1 ring-offset-board-bg';
    else if (color === 'blue') ringClass = 'ring-2 ring-board-blue/70 ring-offset-1 ring-offset-board-bg';
    else if (color === 'assassin') ringClass = 'ring-2 ring-gray-500/70 ring-offset-1 ring-offset-board-bg';
  }

  // Target ring marker (used in spymaster clue-giving mode)
  const targetClass = !glowing && !dimmed && targetMarked
    ? 'ring-[3px] ring-white ring-offset-1 ring-offset-board-bg'
    : '';

  // Dim/glow mode for reveal views
  const highlightGlow = glowing ? glowColors[color] : '';
  const brightnessClass = glowing ? 'brightness-110' : '';
  const dimClass = dimmed ? 'opacity-50' : '';

  const style = revealDelay !== undefined
    ? { transitionDelay: `${revealDelay}ms` }
    : undefined;

  // Show null × marker whenever nullMarked (clue-giving + reveal modes)
  const showNullX = !!nullMarked;

  return (
    <button
      className={`
        card-reveal relative flex items-center justify-center overflow-hidden
        h-[3.2rem] sm:h-[3.6rem] rounded-lg font-card font-bold uppercase tracking-wide select-none
        text-[clamp(0.7rem,3vw,1rem)] p-1 sm:p-2 border border-white/5
        transition-all duration-300
        ${bgClass} ${textClass} ${glowClass} ${interactiveClass}
        ${ringClass} ${targetClass}
        ${highlightGlow} ${brightnessClass} ${dimClass}
      `}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      type="button"
      style={style}
    >
      <span className="text-center leading-tight hyphens-auto" lang="ru" style={{ overflowWrap: 'break-word' }}>{word}</span>

      {pickPercent !== undefined && pickPercent > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.4rem] h-[0.9rem] sm:h-[1rem] px-0.5 rounded-sm bg-orange-500/90 text-white text-[0.5rem] sm:text-[0.55rem] font-bold flex items-center justify-center leading-none">
          {pickPercent}%
        </span>
      )}

      {showNullX && (
        <span className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="drop-shadow-sm" style={{ opacity: 0.7 }}>
            <path d="M8,92 C30,70 70,30 92,8" stroke="#EF5350" strokeWidth="2.5" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
      )}

      {pickOrder !== undefined && (
        <span className="absolute bottom-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/80 text-gray-900 text-[0.6rem] sm:text-xs flex items-center justify-center font-bold">
          {pickOrder}
        </span>
      )}
    </button>
  );
}
