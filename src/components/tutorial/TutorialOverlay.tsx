import { useState, useEffect, useCallback } from 'react';
import type { TutorialStep } from '../../tutorial/types';

interface TutorialHighlightProps {
  step: TutorialStep;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 6;

export default function TutorialHighlight({ step }: TutorialHighlightProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

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

  if (!targetRect || step.highlight.type === 'board') return null;

  return (
    <div
      className="fixed z-[61] rounded-lg pointer-events-none ring-2 ring-board-blue animate-pulse"
      style={{
        top: targetRect.top - PADDING,
        left: targetRect.left - PADDING,
        width: targetRect.width + PADDING * 2,
        height: targetRect.height + PADDING * 2,
      }}
    />
  );
}
