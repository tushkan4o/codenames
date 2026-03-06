import { useState, useEffect, useRef, useCallback } from 'react';
import type { TutorialStep } from '../../tutorial/types';
import { useTranslation } from '../../i18n/useTranslation';

interface TutorialOverlayProps {
  step: TutorialStep;
  onAcknowledge: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 6;

export default function TutorialOverlay({ step, onAcknowledge }: TutorialOverlayProps) {
  const { t } = useTranslation();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [shake, setShake] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const prevStepId = useRef(step.id);

  useEffect(() => {
    if (prevStepId.current !== step.id) {
      setShake(false);
      prevStepId.current = step.id;
    }
  }, [step.id]);

  const measureTarget = useCallback(() => {
    const hl = step.highlight;
    if (hl.type === 'none') {
      setTargetRect(null);
      return;
    }

    let el: Element | null = null;

    if (hl.type === 'element') {
      el = document.querySelector(hl.selector);
    } else if (hl.type === 'card') {
      el = document.querySelector(`[data-card-index="${hl.cardIndex}"]`);
    } else if (hl.type === 'cards') {
      const rects: DOMRect[] = [];
      for (const idx of hl.cardIndices) {
        const cardEl = document.querySelector(`[data-card-index="${idx}"]`);
        if (cardEl) rects.push(cardEl.getBoundingClientRect());
      }
      if (rects.length > 0) {
        const top = Math.min(...rects.map(r => r.top));
        const left = Math.min(...rects.map(r => r.left));
        const bottom = Math.max(...rects.map(r => r.bottom));
        const right = Math.max(...rects.map(r => r.right));
        setTargetRect({ top, left, width: right - left, height: bottom - top });
        return;
      }
      setTargetRect(null);
      return;
    } else if (hl.type === 'board') {
      el = document.querySelector('[data-tutorial-id="board"]');
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    } else {
      setTargetRect(null);
    }
  }, [step.highlight]);

  useEffect(() => {
    measureTarget();
    const handleResize = () => measureTarget();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [measureTarget]);

  const tutorialTexts = t.tutorial as Record<string, string>;
  const text = tutorialTexts[step.textKey] || step.textKey;
  const isAcknowledge = step.action.type === 'acknowledge';
  const position = step.tooltipPosition || 'bottom';

  const getTooltipStyle = (): React.CSSProperties => {
    if (position === 'center' || !targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const centerX = targetRect.left + targetRect.width / 2;
    const tooltipWidth = 320;

    let left = centerX - tooltipWidth / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

    if (position === 'top') {
      return {
        position: 'fixed',
        bottom: window.innerHeight - targetRect.top + PADDING + 8,
        left,
        width: tooltipWidth,
      };
    }
    return {
      position: 'fixed',
      top: targetRect.top + targetRect.height + PADDING + 8,
      left,
      width: tooltipWidth,
    };
  };

  return (
    <>
      {/* Highlight ring around target — no dark backdrop */}
      {targetRect && (
        <div
          className="fixed z-[61] rounded-lg pointer-events-none ring-2 ring-board-blue animate-pulse"
          style={{
            top: targetRect.top - PADDING,
            left: targetRect.left - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`z-[62] bg-gray-800 border border-gray-600 rounded-xl p-4 shadow-2xl max-w-[320px] ${
          shake ? 'animate-shake' : ''
        }`}
        style={getTooltipStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">{text}</p>
        {isAcknowledge && (
          <button
            onClick={onAcknowledge}
            className="mt-3 w-full py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold text-sm transition-colors"
          >
            {tutorialTexts.next || 'Далее'}
          </button>
        )}
      </div>
    </>
  );
}
