import type { GameState } from '../../game/types/game.types';
import type { CardInstance } from '../../game/types/card.types';
import type { PlayerId } from '../../game/types/ids';
import { CARD_CATEGORY_LABELS, getCardDefinition } from '../../game/cards/card.registry';
import { handOf } from '../../game/engine/selectors';
import { canUseCard } from '../../game/cards/cardRules';

export interface HandPanelProps {
  state: GameState;
  playerId: PlayerId;
  title: string;
  onOpenCard: (card: CardInstance) => void;
}

export function HandPanel({ state, playerId, title, onOpenCard }: HandPanelProps) {
  const hand = handOf(state, playerId);

  return (
    <section className="panel panel--hand" aria-label={title}>
      <header className="panel__header">
        <h2 className="panel__title">{title}</h2>
        <span className="panel__count">{hand.length}</span>
      </header>

      {hand.length === 0 ? (
        <p className="panel__empty">Nenhuma carta na mão.</p>
      ) : (
        <ul className="hand">
          {hand.map((card) => {
            const definition = getCardDefinition(card.definitionId);
            const primary = canUseCard(state, card.instanceId, 'PRIMARY');
            const alternate = definition.alternateEffect
              ? canUseCard(state, card.instanceId, 'ALTERNATE')
              : { allowed: false };
            const usable = primary.allowed || alternate.allowed;
            return (
              <li key={card.instanceId as string}>
                <button
                  type="button"
                  className={`card${usable ? ' is-usable' : ''}`}
                  style={{
                    background: `linear-gradient(150deg, ${definition.art.palette[0]}, ${definition.art.palette[1]})`,
                  }}
                  onClick={() => onOpenCard(card)}
                >
                  <span className="card__art" aria-hidden="true">
                    {definition.art.emoji}
                  </span>
                  <span className="card__name">{definition.name}</span>
                  <span className="card__category">
                    {CARD_CATEGORY_LABELS[definition.category]}
                  </span>
                  <span className="card__uses">
                    {card.usesRemaining} uso{card.usesRemaining === 1 ? '' : 's'}
                  </span>
                  <span className={`card__flag${usable ? ' is-on' : ''}`}>
                    {usable ? 'Disponível' : 'Indisponível agora'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
