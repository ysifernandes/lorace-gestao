import type { GameState } from '../../game/types/game.types';
import type { CardInstance, CardMode } from '../../game/types/card.types';
import { getCardDefinition } from '../../game/cards/card.registry';
import { canUseCard } from '../../game/cards/cardRules';
import { Modal } from '../ui/Modal';

export interface CardModalProps {
  state: GameState;
  card: CardInstance;
  onChoose: (mode: CardMode) => void;
  onClose: () => void;
}

/**
 * "UTILIZAR COMO": os dois usos aparecem lado a lado, com o motivo explícito
 * quando um deles não está disponível. Escolher um consome a carta.
 */
export function CardModal({ state, card, onChoose, onClose }: CardModalProps) {
  const definition = getCardDefinition(card.definitionId);
  const options: { mode: CardMode; name: string; description: string }[] = [
    {
      mode: 'PRIMARY',
      name: definition.primaryEffect.name,
      description: definition.primaryEffect.description,
    },
  ];
  if (definition.alternateEffect) {
    options.push({
      mode: 'ALTERNATE',
      name: definition.alternateEffect.name,
      description: definition.alternateEffect.description,
    });
  }

  return (
    <Modal title="Utilizar como" subtitle={definition.name} onClose={onClose}>
      <p className="modal__lead">{definition.description}</p>
      <ul className="card-options">
        {options.map((option) => {
          const availability = canUseCard(state, card.instanceId, option.mode);
          return (
            <li key={option.mode}>
              <button
                type="button"
                className="card-option"
                onClick={() => onChoose(option.mode)}
                disabled={!availability.allowed}
              >
                <strong className="card-option__name">{option.name}</strong>
                <span className="card-option__text">{option.description}</span>
                {!availability.allowed && (
                  <span className="card-option__blocked">{availability.reason}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="modal__warning">
        Atenção: usar um dos efeitos consome a carta. O outro efeito deixa de estar disponível.
      </p>
    </Modal>
  );
}
