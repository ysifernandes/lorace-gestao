import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.6;
const MAX_SCALE = 3;

/**
 * Em telas estreitas o mapa inteiro caberia, mas ilegível. Começamos
 * aproximados e o jogador navega com pan/pinça.
 */
function initialViewport(): Viewport {
  const narrow = typeof window !== 'undefined' && window.innerWidth < 720;
  // Em tela estreita o mapa inteiro caberia, mas com rótulos ilegíveis.
  // Começamos parcialmente aproximados; pan e pinça cobrem o resto.
  return { scale: narrow ? 1.85 : 1, x: 0, y: 0 };
}

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

/**
 * Zoom e pan por ponteiro (mouse, toque e caneta), com pinça de dois dedos.
 * O arrasto só começa depois de um limiar, para não engolir o toque que
 * seleciona um território.
 */
export function useZoomPan() {
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const dragged = useRef(false);

  const reset = useCallback(() => setViewport(initialViewport()), []);

  // O ponteiro pode ser solto fora do mapa (ou o gesto ser cancelado pelo
  // sistema). Sem isso, o pan continuaria "grudado" no cursor.
  useEffect(() => {
    const end = () => {
      pointers.current.clear();
      panStart.current = null;
      pinchStart.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setViewport((v) => ({ ...v, scale: clampScale(v.scale * factor) }));
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      dragged.current = false;
      if (pointers.current.size === 1) {
        panStart.current = {
          x: event.clientX,
          y: event.clientY,
          vx: viewport.x,
          vy: viewport.y,
        };
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinchStart.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          scale: viewport.scale,
        };
        panStart.current = null;
      }
    },
    [viewport],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    // event.buttons === 0 significa "nenhum botão pressionado": não é arrasto.
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      pointers.current.delete(event.pointerId);
      panStart.current = null;
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const ratio = distance / pinchStart.current.distance;
      dragged.current = true;
      setViewport((v) => ({ ...v, scale: clampScale(pinchStart.current!.scale * ratio) }));
      return;
    }

    if (panStart.current) {
      const dx = event.clientX - panStart.current.x;
      const dy = event.clientY - panStart.current.y;
      if (Math.hypot(dx, dy) > 6) dragged.current = true;
      if (!dragged.current) return;
      setViewport((v) => ({ ...v, x: panStart.current!.vx + dx, y: panStart.current!.vy + dy }));
    }
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) panStart.current = null;
  }, []);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) event.preventDefault();
    setViewport((v) => ({ ...v, scale: clampScale(v.scale * (event.deltaY > 0 ? 0.92 : 1.08)) }));
  }, []);

  /** true quando o gesto atual foi um arrasto — a seleção deve ser ignorada. */
  const wasDragged = useCallback(() => dragged.current, []);

  return {
    viewport,
    reset,
    zoomBy,
    wasDragged,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
  };
}
