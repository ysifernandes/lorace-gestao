import { useEffect } from 'react';
import type { GameState } from '../../game/types/game.types';
import { SEQUESTRO_ANIMATION } from '../../game/cards/animations/sequestro.animation';
import { VACINA_ANIMATION } from '../../game/cards/animations/vacina.animation';

const SPECS = [SEQUESTRO_ANIMATION, VACINA_ANIMATION];

export interface AnimationStageProps {
  state: GameState;
  onAcknowledge: (eventId: string) => void;
}

/**
 * PALCO DE ANIMAÇÕES — ESTRUTURA (Etapa 1/2).
 *
 * Ainda não há cinemática: o palco apenas consome a fila de eventos emitida
 * pelas regras e mostra o roteiro que será animado. Trocar este componente
 * por helicóptero, dado girando e partículas não exige tocar em nenhuma regra.
 */
export function AnimationStage({ state, onAcknowledge }: AnimationStageProps) {
  const pending = state.animationQueue.find((event) => event.status === 'PENDING');

  useEffect(() => {
    if (!pending) return;
    const spec = SPECS.find((s) => s.id === pending.specId);
    const total = spec?.beats.reduce((sum, beat) => sum + beat.durationMs, 0) ?? 800;
    // Duração encurtada enquanto é placeholder.
    const timer = window.setTimeout(() => onAcknowledge(pending.id), Math.min(total / 3, 2200));
    return () => window.clearTimeout(timer);
  }, [pending, onAcknowledge]);

  if (!pending) return null;
  const spec = SPECS.find((s) => s.id === pending.specId);
  const dice = pending.payload.diceValue as number | undefined;

  return (
    <div className="animation-stage" role="status" aria-live="polite">
      <div className="animation-stage__card">
        <span className="animation-stage__icon" aria-hidden="true">
          {spec?.id === 'anim.vacina' ? '🧬' : '🚁'}
        </span>
        <strong>{spec?.name ?? 'Animação'}</strong>
        {dice !== undefined && <span className="animation-stage__dice">🎲 {dice}</span>}
        <ol className="animation-stage__beats">
          {spec?.beats.map((beat) => (
            <li key={beat.kind}>{beat.kind.toLowerCase().replace(/_/g, ' ')}</li>
          ))}
        </ol>
        <button type="button" className="btn btn--small" onClick={() => onAcknowledge(pending.id)}>
          Pular
        </button>
      </div>
    </div>
  );
}
