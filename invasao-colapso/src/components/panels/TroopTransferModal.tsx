import { useState } from 'react';
import type { Territory } from '../../game/types/territory.types';
import { Modal } from '../ui/Modal';
import { NumberStepper } from '../ui/NumberStepper';

export interface TroopTransferModalProps {
  kind: 'MOVE' | 'ATTACK';
  from: Territory;
  to: Territory;
  max: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}

/** Escolha da quantidade para mover tropas ou declarar um ataque. */
export function TroopTransferModal({
  kind,
  from,
  to,
  max,
  onConfirm,
  onClose,
}: TroopTransferModalProps) {
  const [amount, setAmount] = useState(1);
  const isAttack = kind === 'ATTACK';

  return (
    <Modal
      title={isAttack ? 'Declarar ataque' : 'Mover tropas'}
      subtitle={`${from.name} → ${to.name}`}
      onClose={onClose}
      tone={isAttack ? 'danger' : 'default'}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={`btn ${isAttack ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => onConfirm(amount)}
            disabled={max < 1}
          >
            {isAttack ? `Atacar com ${amount}` : `Mover ${amount}`}
          </button>
        </>
      }
    >
      {max < 1 ? (
        <p className="modal__warning">
          {from.name} não tem tropas suficientes: é obrigatório deixar ao menos 1 soldado.
        </p>
      ) : (
        <>
          <NumberStepper
            label={isAttack ? 'Soldados no ataque' : 'Soldados a mover'}
            value={amount}
            min={1}
            max={max}
            onChange={setAmount}
          />
          <dl className="preview">
            <div>
              <dt>{from.name}</dt>
              <dd>
                {from.garrison.length} → {from.garrison.length - (isAttack ? 0 : amount)}
              </dd>
            </div>
            <div>
              <dt>{to.name}</dt>
              <dd>
                {to.garrison.length}
                {isAttack ? ' (defensores)' : ` → ${to.garrison.length + amount}`}
              </dd>
            </div>
          </dl>
        </>
      )}
    </Modal>
  );
}
