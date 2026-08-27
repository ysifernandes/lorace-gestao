import { useEffect, useState } from 'react';
import type { GameState } from '../../game/types/game.types';
import { getCollapseEvent } from '../../game/collapse/collapseEngine';

export interface CollapseOverlayProps {
  state: GameState;
  onResolve: () => void;
}

type Stage = 'ALERT' | 'COUNT' | 'REVEAL';

/**
 * ALERTA DE COLAPSO — sequência funcional do MVP.
 *
 * silêncio → sirene → HUD em alerta → ⚠ ALERTA DE COLAPSO → 3 · 2 · 1 →
 * evento revelado → efeito aplicado → partida continua.
 *
 * A apresentação definitiva (áudio, interferência no mapa) entra na etapa
 * de direção de arte; a estrutura de estados já é esta.
 */
export function CollapseOverlay({ state, onResolve }: CollapseOverlayProps) {
  const pending = state.collapse.pending;
  const [stage, setStage] = useState<Stage>('ALERT');
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (!pending) return;
    setStage('ALERT');
    setCount(3);
    const toCount = window.setTimeout(() => setStage('COUNT'), 1100);
    return () => window.clearTimeout(toCount);
  }, [pending?.eventId]);

  useEffect(() => {
    if (stage !== 'COUNT') return;
    if (count <= 0) {
      setStage('REVEAL');
      return;
    }
    const timer = window.setTimeout(() => setCount((c) => c - 1), 620);
    return () => window.clearTimeout(timer);
  }, [stage, count]);

  if (!pending) return null;
  const event = getCollapseEvent(pending.eventId);

  return (
    <div className="collapse-overlay" role="alertdialog" aria-live="assertive">
      <div className="collapse-overlay__scan" aria-hidden="true" />
      {stage === 'ALERT' ? (
        <div className="collapse-overlay__alert">
          <span className="collapse-overlay__siren" aria-hidden="true">
            🚨
          </span>
          <h2>⚠ ALERTA DE COLAPSO</h2>
        </div>
      ) : null}

      {stage === 'COUNT' ? (
        <div className="collapse-overlay__count" aria-label={`Contagem ${count}`}>
          {count > 0 ? count : ''}
        </div>
      ) : null}

      {stage === 'REVEAL' ? (
        <div className="collapse-overlay__reveal">
          <p className="collapse-overlay__cats">{event.categories.join(' · ')}</p>
          <h2>{event.name}</h2>
          <p className="collapse-overlay__flavor">{event.flavor}</p>
          <p className="collapse-overlay__desc">{event.description}</p>
          <button type="button" className="btn btn--danger btn--xl" onClick={onResolve}>
            Aplicar efeito
          </button>
        </div>
      ) : null}
    </div>
  );
}
