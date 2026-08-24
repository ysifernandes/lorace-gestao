import { useMemo, useState } from 'react';
import type { GameState } from '../../game/types/game.types';
import type { TerritoryId } from '../../game/types/ids';
import { territoriesOf } from '../../game/map/territory';
import { BALANCE } from '../../game/config/balance';
import { Modal } from '../ui/Modal';
import { NumberStepper } from '../ui/NumberStepper';

export interface OperacaoAereaModalProps {
  state: GameState;
  onConfirm: (params: { from: TerritoryId; to: TerritoryId; amount: number }) => void;
  onClose: () => void;
}

/**
 * Ponte aérea: origem e destino Humanos, com ou sem fronteira.
 * A interface só oferece o que a regra aceita — a validação final é do motor.
 */
export function OperacaoAereaModal({ state, onConfirm, onClose }: OperacaoAereaModalProps) {
  const minLeft = BALANCE.abilities.operacaoAerea.minLeftBehind;
  const owned = useMemo(() => territoriesOf(state, state.turn.currentPlayerId), [state]);
  const origins = owned.filter((t) => t.garrison.length > minLeft);
  const [from, setFrom] = useState<TerritoryId | null>(origins[0]?.id ?? null);
  const [to, setTo] = useState<TerritoryId | null>(null);
  const [amount, setAmount] = useState(1);

  const origin = origins.find((t) => t.id === from) ?? origins[0];
  const destinations = owned.filter((t) => t.id !== origin?.id);
  const target = destinations.find((t) => t.id === to);
  const max = origin ? Math.max(0, origin.garrison.length - minLeft) : 0;

  if (origins.length === 0) {
    return (
      <Modal title="Operação Aérea" onClose={onClose} tone="action">
        <p className="modal__lead">
          Nenhum território seu tem tropas sobrando: é obrigatório deixar ao menos {minLeft}{' '}
          soldado(s) na origem.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Operação Aérea"
      subtitle="Transporte entre territórios seus, com ou sem fronteira"
      onClose={onClose}
      tone="action"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!origin || !target || max < 1}
            onClick={() =>
              origin && target && onConfirm({ from: origin.id, to: target.id, amount })
            }
          >
            Executar transporte
          </button>
        </>
      }
    >
      <h3 className="chooser__title">Origem</h3>
      <div className="chooser" role="group" aria-label="Território de origem">
        {origins.map((territory) => (
          <button
            key={territory.id as string}
            type="button"
            className={`chip${territory.id === origin?.id ? ' is-on' : ''}`}
            onClick={() => {
              setFrom(territory.id);
              setTo(null);
              setAmount(1);
            }}
          >
            {territory.name}
            <em>{territory.garrison.length}</em>
          </button>
        ))}
      </div>

      <h3 className="chooser__title">Destino</h3>
      <div className="chooser" role="group" aria-label="Território de destino">
        {destinations.map((territory) => {
          const adjacent = origin?.neighbors.includes(territory.id);
          return (
            <button
              key={territory.id as string}
              type="button"
              className={`chip${territory.id === target?.id ? ' is-on' : ''}`}
              onClick={() => setTo(territory.id)}
            >
              {territory.name}
              <em>{territory.garrison.length}</em>
              {!adjacent && <span className="chip__tag">sem fronteira</span>}
            </button>
          );
        })}
      </div>

      {origin && target && (
        <>
          <NumberStepper
            label="Soldados transportados"
            value={Math.min(amount, max)}
            min={1}
            max={max}
            onChange={setAmount}
          />
          <dl className="preview">
            <div>
              <dt>{origin.name}</dt>
              <dd>
                {origin.garrison.length} → {origin.garrison.length - Math.min(amount, max)}
              </dd>
            </div>
            <div>
              <dt>{target.name}</dt>
              <dd>
                {target.garrison.length} → {target.garrison.length + Math.min(amount, max)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </Modal>
  );
}
