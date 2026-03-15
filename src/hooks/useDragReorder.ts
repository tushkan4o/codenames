import { useState, useRef, useCallback, useEffect } from 'react';

const DRAG_THRESHOLD = 5;

interface DragState {
  active: boolean;
  startX: number;
  startY: number;
  draggedOriginalIdx: number; // which original card we're dragging
  pointerId: number;
  cardRect: DOMRect | null;
}

export function useDragReorder(cardCount: number) {
  const [displayOrder, setDisplayOrder] = useState<number[]>(() =>
    Array.from({ length: cardCount }, (_, i) => i),
  );
  const [draggingOrigIdx, setDraggingOrigIdx] = useState<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const cardRefsMap = useRef<Map<number, HTMLElement>>(new Map());
  const displayOrderRef = useRef(displayOrder);
  displayOrderRef.current = displayOrder;

  // Reset when cardCount changes (new board)
  useEffect(() => {
    setDisplayOrder(Array.from({ length: cardCount }, (_, i) => i));
    setDraggingOrigIdx(null);
  }, [cardCount]);

  const registerCardRef = useCallback((visualIdx: number, el: HTMLElement | null) => {
    if (el) cardRefsMap.current.set(visualIdx, el);
    else cardRefsMap.current.delete(visualIdx);
  }, []);

  const handlePointerDown = useCallback((visualIdx: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = cardRefsMap.current.get(visualIdx);
    const originalIdx = displayOrderRef.current[visualIdx];
    dragRef.current = {
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      draggedOriginalIdx: originalIdx,
      pointerId: e.pointerId,
      cardRect: el?.getBoundingClientRect() ?? null,
    };
  }, []);

  // Helper: find visual index of an original card index
  function findVisualIdx(origIdx: number): number {
    return displayOrderRef.current.indexOf(origIdx);
  }

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.active = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Create floating clone
      const currentVisualIdx = findVisualIdx(drag.draggedOriginalIdx);
      const sourceEl = cardRefsMap.current.get(currentVisualIdx);
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

      setDraggingOrigIdx(drag.draggedOriginalIdx);
    }

    // Move floating clone
    if (floatingRef.current && drag.cardRect) {
      floatingRef.current.style.left = `${drag.cardRect.left + dx}px`;
      floatingRef.current.style.top = `${drag.cardRect.top + dy}px`;
    }

    // Detect which card we're over
    if (floatingRef.current) floatingRef.current.style.display = 'none';
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    if (floatingRef.current) floatingRef.current.style.display = '';

    const slotEl = elUnder?.closest('[data-visual-index]') as HTMLElement | null;
    if (!slotEl) return;
    const overVisualIdx = Number(slotEl.dataset.visualIndex);

    // Live swap: if hovering over a different slot than where dragged card currently is
    const currentDragVisualIdx = findVisualIdx(drag.draggedOriginalIdx);
    if (overVisualIdx !== currentDragVisualIdx) {
      // Record rects for FLIP
      const rects = new Map<number, DOMRect>();
      cardRefsMap.current.forEach((el, idx) => {
        rects.set(idx, el.getBoundingClientRect());
      });

      setDisplayOrder((prev) => {
        const next = [...prev];
        [next[currentDragVisualIdx], next[overVisualIdx]] = [next[overVisualIdx], next[currentDragVisualIdx]];
        return next;
      });

      // FLIP animation for the non-dragged card that moved
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardRefsMap.current.forEach((el, idx) => {
            const prevRect = rects.get(idx);
            if (!prevRect) return;
            // Skip the dragged card's slot (it's invisible anyway)
            const origAtSlot = displayOrderRef.current[idx];
            if (origAtSlot === drag.draggedOriginalIdx) return;

            const newRect = el.getBoundingClientRect();
            const ddx = prevRect.left - newRect.left;
            const ddy = prevRect.top - newRect.top;
            if (Math.abs(ddx) < 1 && Math.abs(ddy) < 1) return;

            el.style.transform = `translate(${ddx}px, ${ddy}px)`;
            el.style.transition = 'none';
            requestAnimationFrame(() => {
              el.style.transition = 'transform 200ms cubic-bezier(0.2,0,0,1)';
              el.style.transform = '';
              const onEnd = () => { el.style.transition = ''; el.style.transform = ''; el.removeEventListener('transitionend', onEnd); };
              el.addEventListener('transitionend', onEnd);
            });
          });
        });
      });
    }
  }, []);

  // Shared cleanup: remove floating clone and reset drag state
  const cleanupDrag = useCallback(() => {
    if (floatingRef.current) {
      floatingRef.current.remove();
      floatingRef.current = null;
    }
    dragRef.current = null;
    setDraggingOrigIdx(null);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent): boolean => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return false;

    const wasDrag = drag.active;
    cleanupDrag();
    return wasDrag;
  }, [cleanupDrag]);

  // Global fallback: pointerup/pointercancel outside the grid (iOS Safari fires pointercancel)
  useEffect(() => {
    function handleGlobalEnd(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      if (e.pointerId !== drag.pointerId) return;
      cleanupDrag();
    }
    window.addEventListener('pointerup', handleGlobalEnd);
    window.addEventListener('pointercancel', handleGlobalEnd);
    return () => {
      window.removeEventListener('pointerup', handleGlobalEnd);
      window.removeEventListener('pointercancel', handleGlobalEnd);
    };
  }, [cleanupDrag]);

  // Cleanup on unmount (e.g., navigating to next clue while dragging)
  useEffect(() => {
    return () => {
      if (floatingRef.current) {
        floatingRef.current.remove();
        floatingRef.current = null;
      }
      dragRef.current = null;
    };
  }, []);

  const flipAnimate = useCallback(() => {
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
            const onEnd = () => { el.style.transition = ''; el.style.transform = ''; el.removeEventListener('transitionend', onEnd); };
            el.addEventListener('transitionend', onEnd);
          });
        });
      });
    });
  }, []);

  const prevRectsRef = useRef<Map<number, DOMRect>>(new Map());

  const resetOrder = useCallback(() => {
    const rects = new Map<number, DOMRect>();
    cardRefsMap.current.forEach((el, idx) => {
      rects.set(idx, el.getBoundingClientRect());
    });
    prevRectsRef.current = rects;

    setDisplayOrder(Array.from({ length: cardCount }, (_, i) => i));
    setDraggingOrigIdx(null);

    flipAnimate();
  }, [cardCount, flipAnimate]);

  const setOrder = useCallback((newOrder: number[]) => {
    const rects = new Map<number, DOMRect>();
    cardRefsMap.current.forEach((el, idx) => {
      rects.set(idx, el.getBoundingClientRect());
    });
    prevRectsRef.current = rects;

    setDisplayOrder(newOrder);
    setDraggingOrigIdx(null);

    flipAnimate();
  }, [flipAnimate]);

  return {
    displayOrder,
    draggingOrigIdx,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    registerCardRef,
    resetOrder,
    setOrder,
  };
}
