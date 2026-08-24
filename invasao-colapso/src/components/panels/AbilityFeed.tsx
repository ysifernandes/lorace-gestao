import { useEffect, useState } from 'react';
import type { GameState } from '../../game/types/game.types';

/**
 * Retorno visual de habilidade. Não é a animação final — é o aviso funcional
 * que garante que o jogador percebeu o que aconteceu.
 */
export function AbilityFeed({ state }: { state: GameState }) {
  const latest = state.abilityFeed[0];
  const [dismissed, setDismissed] = useState<string | null>(null);
  const key = latest ? `${latest.abilityId}:${latest.turn}:${state.abilityFeed.length}` : null;

  useEffect(() => {
    if (!key) return;
    const timer = window.setTimeout(() => setDismissed(key), 4000);
    return () => window.clearTimeout(timer);
  }, [key]);

  if (!latest || dismissed === key) return null;

  return (
    <div className="ability-feed" role="status" aria-live="polite">
      <strong className="ability-feed__title">{latest.title}</strong>
      {latest.detail && <span className="ability-feed__detail">{latest.detail}</span>}
    </div>
  );
}
