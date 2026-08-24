import type { GameState } from '../../game/types/game.types';
import type { CardInstance } from '../../game/types/card.types';
import { getCardDefinition } from '../../game/cards/card.registry';
import { canUseCard } from '../../game/cards/cardRules';
import { handOf } from '../../game/engine/selectors';

export interface DefensePromptProps {
  state: GameState;
  onUseDefensiveCard: (card: CardInstance) => void;
  onResolve: () => void;
  onDevWin: () => void;
}

/**
 * Janela defensiva: enquanto existe um ataque declarado, o DEFENSOR pode
 * reagir com uma carta — mesmo não sendo o jogador do turno.
 */
export function DefensePrompt({
  state,
  onUseDefensiveCard,
  onResolve,
  onDevWin,
}: DefensePromptProps) {
  const attack = state.pendingAttack;
  if (!attack || attack.status !== 'DECLARED') return null;

  const attacker = state.players[attack.attackerPlayerId as string];
  const defender = state.players[attack.defenderPlayerId as string];
  const from = state.territories[attack.fromTerritoryId as string];
  const to = state.territories[attack.toTerritoryId as string];
  const defensiveCards = handOf(state, attack.defenderPlayerId).filter(
    (card) => canUseCard(state, card.instanceId, 'ALTERNATE').allowed,
  );
  const attackersAlive = attack.attackingSoldierIds.filter(
    (id) => state.soldiers[id as string]?.alive,
  ).length;

  return (
    <section className="panel panel--defense" aria-label="Ataque em andamento">
      <header className="panel__header">
        <h2 className="panel__title">⚔ Ataque em andamento</h2>
      </header>
      <p className="panel__lead">
        <strong>{attacker?.name}</strong> ataca <strong>{to?.name}</strong> a partir de{' '}
        {from?.name} com <strong>{attackersAlive}</strong> soldado(s).{' '}
        {defender?.name} defende com {to?.garrison.length} soldado(s).
      </p>

      {defensiveCards.length > 0 && (
        <div className="defense-cards">
          <h3>Resposta defensiva de {defender?.name}</h3>
          {defensiveCards.map((card) => {
            const definition = getCardDefinition(card.definitionId);
            return (
              <button
                key={card.instanceId as string}
                type="button"
                className="btn btn--defense"
                onClick={() => onUseDefensiveCard(card)}
              >
                Usar {definition.alternateEffect?.name ?? definition.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="panel__actions">
        <button type="button" className="btn btn--danger" onClick={onDevWin}>
          Resolver combate (temporário)
        </button>
        <button type="button" className="btn" onClick={onResolve}>
          Encerrar ataque
        </button>
      </div>
    </section>
  );
}
