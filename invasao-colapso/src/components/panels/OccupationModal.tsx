import { useState } from 'react';
import type { GameState } from '../../game/types/game.types';
import { Modal } from '../ui/Modal';
import { NumberStepper } from '../ui/NumberStepper';

export interface OccupationModalProps {
  state: GameState;
  onConfirm: (amount: number) => void;
}

/**
 * Ocupação obrigatória: um território conquistado nunca fica com 0 tropas,
 * e o território de origem nunca fica vazio. Sem botão de cancelar.
 */
export function OccupationModal({ state, onConfirm }: OccupationModalProps) {
  const occupation = state.pendingOccupation;
  const [amount, setAmount] = useState(occupation?.min ?? 1);
  if (!occupation) return null;

  const from = state.territories[occupation.fromTerritoryId as string];
  const to = state.territories[occupation.toTerritoryId as string];

  return (
    <Modal
      title="Território conquistado"
      subtitle={`${to?.name ?? ''} passou ao seu controle`}
      tone="action"
      footer={
        <button type="button" className="btn btn--primary" onClick={() => onConfirm(amount)}>
          Ocupar com {amount} soldado{amount === 1 ? '' : 's'}
        </button>
      }
    >
      <p className="modal__lead">
        A ocupação é obrigatória: mova tropas de <strong>{from?.name}</strong> para{' '}
        <strong>{to?.name}</strong>. Apenas as tropas que atacaram podem ocupar, e ao menos
        1 soldado permanece na origem.
      </p>
      <NumberStepper
        label="Soldados que ocupam o território"
        value={amount}
        min={occupation.min}
        max={occupation.max}
        onChange={setAmount}
      />
      <dl className="preview">
        <div>
          <dt>{from?.name}</dt>
          <dd>
            {from?.garrison.length} → {(from?.garrison.length ?? 0) - amount}
          </dd>
        </div>
        <div>
          <dt>{to?.name}</dt>
          <dd>0 → {amount}</dd>
        </div>
      </dl>
    </Modal>
  );
}
