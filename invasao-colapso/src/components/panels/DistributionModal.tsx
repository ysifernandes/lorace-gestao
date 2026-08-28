import { useMemo, useState } from 'react';
import type { GameState } from '../../game/types/game.types';
import type { TerritoryId } from '../../game/types/ids';
import { reserveSoldiers } from '../../game/engine/selectors';
import { territoriesOf } from '../../game/map/territory';
import { Modal } from '../ui/Modal';

export interface DistributionModalProps {
  state: GameState;
  onConfirm: (assignments: { territoryId: TerritoryId; amount: number }[]) => void;
}

/** Redistribuição das tropas capturadas nos territórios do jogador. */
export function DistributionModal({ state, onConfirm }: DistributionModalProps) {
  const ownerId = state.pendingDistribution?.playerId ?? state.turn.currentPlayerId;
  const reserve = reserveSoldiers(state, ownerId);
  const territories = useMemo(() => territoriesOf(state, ownerId), [state, ownerId]);
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  const placed = Object.values(assignments).reduce((sum, n) => sum + n, 0);
  const remaining = reserve.length - placed;

  function add(territoryId: TerritoryId, delta: number) {
    setAssignments((current) => {
      const key = territoryId as string;
      const next = Math.max(0, (current[key] ?? 0) + delta);
      if (delta > 0 && remaining <= 0) return current;
      return { ...current, [key]: next };
    });
  }

  return (
    <Modal
      title="Redistribuir tropas capturadas"
      subtitle={`${reserve.length} soldado(s) incorporado(s) ao seu exército`}
      tone="action"
      footer={
        <>
          <span className="modal__counter">{remaining} por posicionar</span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={remaining !== 0}
            onClick={() =>
              onConfirm(
                Object.entries(assignments)
                  .filter(([, amount]) => amount > 0)
                  .map(([territoryId, amount]) => ({
                    territoryId: territoryId as TerritoryId,
                    amount,
                  })),
              )
            }
          >
            Confirmar posicionamento
          </button>
        </>
      }
    >
      <p className="modal__lead">
        As tropas agora servem à sua facção. Escolha em quais territórios elas entram.
      </p>
      <ul className="distribution">
        {territories.map((territory) => {
          const amount = assignments[territory.id as string] ?? 0;
          return (
            <li key={territory.id as string}>
              <div className="distribution__info">
                <strong>{territory.name}</strong>
                <span>{territory.garrison.length} tropas</span>
              </div>
              <div className="distribution__controls">
                <button
                  type="button"
                  className="btn btn--round"
                  onClick={() => add(territory.id, -1)}
                  disabled={amount === 0}
                  aria-label={`Remover de ${territory.name}`}
                >
                  −
                </button>
                <output>{amount}</output>
                <button
                  type="button"
                  className="btn btn--round"
                  onClick={() => add(territory.id, 1)}
                  disabled={remaining <= 0}
                  aria-label={`Adicionar em ${territory.name}`}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
