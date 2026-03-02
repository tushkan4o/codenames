import type { CardColor } from '../../types/game';
import type { CardFontSize } from '../../types/user';

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
  fontSize?: CardFontSize;
  revealing?: boolean;
  revealDuration?: number;
}

const fontSizeMap: Record<CardFontSize, string> = {
  sm: 'text-[clamp(0.6rem,2.6vw,0.85rem)]',
  md: 'text-[clamp(0.75rem,3.2vw,1.05rem)]',
  lg: 'text-[clamp(0.9rem,3.8vw,1.25rem)]',
};

const colorConfig: Record<CardColor, { bg: string; text: string; glow: string }> = {
  red: {
    bg: 'bg-board-red',
    text: 'text-gray-800',
    glow: 'shadow-[0_0_18px_rgba(239,83,80,0.5)]',
  },
  blue: {
    bg: 'bg-board-blue',
    text: 'text-gray-800',
    glow: 'shadow-[0_0_18px_rgba(66,165,245,0.5)]',
  },
  neutral: {
    bg: 'bg-board-neutral',
    text: 'text-gray-800',
    glow: '',
  },
  assassin: {
    bg: 'bg-board-assassin',
    text: 'text-gray-400',
    glow: 'shadow-[0_0_12px_rgba(0,0,0,0.6)]',
  },
};

const glowColors: Record<CardColor, string> = {
  red: 'shadow-[0_0_16px_4px_rgba(239,83,80,0.55)]',
  blue: 'shadow-[0_0_16px_4px_rgba(66,165,245,0.55)]',
  neutral: 'shadow-[0_0_10px_3px_rgba(255,255,255,0.2)]',
  assassin: 'shadow-[0_0_10px_3px_rgba(0,0,0,0.5)]',
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
  fontSize,
  revealing,
  revealDuration,
}: CardProps) {
  // During border trace animation, don't show color yet
  const shouldShowColor = (showColor || revealed) && !revealing;
  const cfg = colorConfig[color];

  const bgClass = shouldShowColor ? cfg.bg : 'bg-board-card';
  const textClass = shouldShowColor ? cfg.text : 'text-gray-700';
  const glowClass = shouldShowColor && !glowing && !dimmed ? cfg.glow : '';
  const revealingClass = revealing ? 'card-border-reveal' : '';

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
  const brightnessClass = glowing ? 'brightness-125' : '';

  // No border on dimmed cards
  const borderClass = dimmed ? 'border border-transparent' : shouldShowColor ? 'border border-white/5' : 'border border-gray-400/20';

  const style: React.CSSProperties = {
    ...(revealDelay !== undefined ? { transitionDelay: `${revealDelay}ms` } : {}),
    ...(revealing && revealDuration ? { '--reveal-duration': `${revealDuration}ms` } as React.CSSProperties : {}),
  };

  // Show null × marker whenever nullMarked (clue-giving + reveal modes)
  const showNullX = !!nullMarked;

  // Percent text color: dark on bright (glowing) cards, light on dimmed cards
  const percentTextClass = dimmed ? 'text-gray-300' : 'text-gray-900';

  return (
    <button
      className={`
        card-reveal relative flex items-center justify-center overflow-hidden w-full
        h-[3.2rem] sm:h-[3.8rem] rounded-lg font-card font-bold uppercase tracking-wide select-none
        ${fontSizeMap[fontSize || 'md']} p-1 sm:p-2 ${borderClass}
        transition-all duration-300
        ${bgClass} ${textClass} ${glowClass} ${interactiveClass}
        ${ringClass} ${targetClass}
        ${highlightGlow} ${brightnessClass} ${revealingClass}
      `}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      type="button"
      style={style}
    >
      <span className="text-center leading-tight hyphens-auto" lang="ru" style={{ overflowWrap: 'break-word' }}>{word}</span>

      {/* Dim overlay — dims card but corners stay bright above it */}
      {dimmed && (
        <span className="absolute -inset-px bg-black/35 pointer-events-none rounded-lg" style={{ zIndex: 1 }} />
      )}

      {showNullX && (
        <span className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="drop-shadow-sm" style={{ opacity: 0.7 }}>
            <path d="M8,92 C30,70 70,30 92,8" stroke="#EF5350" strokeWidth="2.5" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
      )}

      {pickPercent !== undefined && pickPercent > 0 && (
        <span
          className={`absolute ${percentTextClass} text-[0.55rem] sm:text-[0.6rem]`}
          style={{
            top: '0.05rem', left: '0.15rem',
            zIndex: 3,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {pickPercent}%
        </span>
      )}

      {pickOrder !== undefined && (
        <span
          className="absolute flex items-end justify-end text-gray-900 font-bold text-[0.6rem] sm:text-xs"
          style={{
            bottom: 0, right: 0,
            width: '2.4rem', height: '2.4rem',
            clipPath: 'polygon(100% 30%, 30% 100%, 100% 100%)',
            background: 'rgba(255,255,255,0.85)',
            paddingBottom: '0.05rem', paddingRight: '0.3rem',
            zIndex: 3,
          }}
        >
          {pickOrder}
        </span>
      )}
    </button>
  );
}
