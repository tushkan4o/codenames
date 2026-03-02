import { useState, useRef, useCallback, useEffect } from 'react';

const DRAG_THRESHOLD = 5;

interface DragState {
  active: boolean;
  startX: number;
  startY: number;
  visualIdx: number;
  pointerId: number;
  cardRect: DOMRect | null;
}

export interface DragRenderState {
  dragVisualIdx: number;
  overVisualIdx: number | null;
}

export function useDragReorder(cardCount: number) {
  const [displayOrder, setDisplayOrder] = useState<number[]>(() =>
    Array.from({ length: cardCount }, (_, i) => i),
  );
  const [dragRender, setDragRender] = useState<DragRenderState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const cardRefsMap = useRef<Map<number, HTMLElement>>(new Map());
  const prevRectsRef = useRef<Map<number, DOMRect>>(new Map());

  // Reset when cardCount changes (new board)
  useEffect(() => {
    setDisplayOrder(Array.from({ length: cardCount }, (_, i) => i));
    setDragRender(null);
  }, [cardCount]);

  const registerCardRef = useCallback((visualIdx: number, el: HTMLElement | null) => {
    if (el) cardRefsMap.current.set(visualIdx, el);
    else cardRefsMap.current.delete(visualIdx);
  }, []);

  const handlePointerDown = useCallback((visualIdx: number, e: React.PointerEvent) => {
    if (e.button !== 0) return; // left button only
    const el = cardRefsMap.current.get(visualIdx);
    dragRef.current = {
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      visualIdx,
      pointerId: e.pointerId,
      cardRect: el?.getBoundingClientRect() ?? null,
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      // Start dragging
      drag.active = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Create floating clone
      const sourceEl = cardRefsMap.current.get(drag.visualIdx);
      if (sourceEl && drag.cardRect) {
        const clone = sourceEl.cloneNode(true) as HTMLDivElement;
        clone.className = 'card-drag-floating';
        clone.style.position = 'fixed';
        clone.style.width = `${drag.cardRect.width}px`;
        clone.style.height = `${drag.cardRect.height}px`;
        clone.style.left = `${drag.cardRect.left}px`;
        clone.style.top = `${drag.cardRect.top}px`;
        clone.style.zIndex = '50';
        clone.style.pointerEvents = 'none';
        clone.style.transform = 'scale(1.08)';
        clone.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
        clone.style.borderRadius = '0.5rem';
        clone.style.transition = 'none';
        document.body.appendChild(clone);
        floatingRef.current = clone;
      }

      setDragRender({ dragVisualIdx: drag.visualIdx, overVisualIdx: null });
    }

    // Move floating clone
    if (floatingRef.current && drag.cardRect) {
      floatingRef.current.style.left = `${drag.cardRect.left + dx}px`;
      floatingRef.current.style.top = `${drag.cardRect.top + dy}px`;
    }

    // Detect which card we're over
    if (floatingRef.current) {
      floatingRef.current.style.display = 'none';
    }
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    if (floatingRef.current) {
      floatingRef.current.style.display = '';
    }

    const slotEl = elUnder?.closest('[data-visual-index]') as HTMLElement | null;
    const overIdx = slotEl ? Number(slotEl.dataset.visualIndex) : null;

    setDragRender((prev) => {
      if (!prev) return prev;
      if (prev.overVisualIdx === overIdx) return prev;
      return { ...prev, overVisualIdx: overIdx };
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent): boolean => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return false;

    const wasDrag = drag.active;

    // Clean up floating clone
    if (floatingRef.current) {
      floatingRef.current.remove();
      floatingRef.current = null;
    }

    if (wasDrag) {
      // Find drop target
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = elUnder?.closest('[data-visual-index]') as HTMLElement | null;
      const toVisualIdx = slotEl ? Number(slotEl.dataset.visualIndex) : null;
      const fromVisualIdx = drag.visualIdx;

      if (toVisualIdx !== null && toVisualIdx !== fromVisualIdx) {
        // Record rects before swap for FLIP animation
        const rects = new Map<number, DOMRect>();
        cardRefsMap.current.forEach((el, idx) => {
          rects.set(idx, el.getBoundingClientRect());
        });
        prevRectsRef.current = rects;

        // Perform swap
        setDisplayOrder((prev) => {
          const next = [...prev];
          [next[fromVisualIdx], next[toVisualIdx]] = [next[toVisualIdx], next[fromVisualIdx]];
          return next;
        });

        // FLIP animation after React re-render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            cardRefsMap.current.forEach((el, idx) => {
              const prevRect = prevRectsRef.current.get(idx);
              if (!prevRect) return;
              const newRect = el.getBoundingClientRect();
              const dx = prevRect.left - newRect.left;
              const dy = prevRect.top - newRect.top;
              if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

              el.style.transform = `translate(${dx}px, ${dy}px)`;
              el.style.transition = 'none';

              requestAnimationFrame(() => {
                el.style.transition = 'transform 250ms cubic-bezier(0.2,0,0,1)';
                el.style.transform = '';

                const onEnd = () => {
                  el.style.transition = '';
                  el.style.transform = '';
                  el.removeEventListener('transitionend', onEnd);
                };
                el.addEventListener('transitionend', onEnd);
              });
            });
          });
        });
      }
    }

    dragRef.current = null;
    setDragRender(null);

    return wasDrag;
  }, []);

  const resetOrder = useCallback(() => {
    // Record rects for FLIP before reset
    const rects = new Map<number, DOMRect>();
    cardRefsMap.current.forEach((el, idx) => {
      rects.set(idx, el.getBoundingClientRect());
    });
    prevRectsRef.current = rects;

    setDisplayOrder(Array.from({ length: cardCount }, (_, i) => i));
    setDragRender(null);

    // FLIP animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cardRefsMap.current.forEach((el, idx) => {
          const prevRect = prevRectsRef.current.get(idx);
          if (!prevRect) return;
          const newRect = el.getBoundingClientRect();
          const dx = prevRect.left - newRect.left;
          const dy = prevRect.top - newRect.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

          el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.transition = 'none';

          requestAnimationFrame(() => {
            el.style.transition = 'transform 250ms cubic-bezier(0.2,0,0,1)';
            el.style.transform = '';

            const onEnd = () => {
              el.style.transition = '';
              el.style.transform = '';
              el.removeEventListener('transitionend', onEnd);
            };
            el.addEventListener('transitionend', onEnd);
          });
        });
      });
    });
  }, [cardCount]);

  return {
    displayOrder,
    dragRender,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    registerCardRef,
    resetOrder,
  };
}
