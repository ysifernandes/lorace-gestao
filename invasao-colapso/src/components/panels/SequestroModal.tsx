import { useMemo, useState } from 'react';
import type { GameState } from '../../game/types/game.types';
import type { SoldierId, TerritoryId } from '../../game/types/ids';
import { capturableSoldiers } from '../../game/engine/selectors';
import { SEQUESTRO_MAX_TARGETS } from '../../game/cards/sequestro.card';
import { Modal } from '../ui/Modal';

export interface SequestroModalProps {
  state: GameState;
  onConfirm: (soldierIds: SoldierId[]) => void;
  onClose: () => void;
  /** Território pré-selecionado no mapa, quando houver. */
  initialTerritoryId?: TerritoryId | null;
}

/**
 * Seleção dos alvos do Sequestro direto pelo mapa: escolhe-se um território
 * inimigo e depois os soldados. O limite de 7 é imposto aqui e revalidado
 * pelo motor (a UI nunca é a única barreira).
 */
export function SequestroModal({
  state,
  onConfirm,
  onClose,
  initialTerritoryId,
}: SequestroModalProps) {
  const groups = useMemo(
    () => capturableSoldiers(state, state.turn.currentPlayerId),
    [state],
  );
  const [territoryId, setTerritoryId] = useState<TerritoryId | null>(
    initialTerritoryId ?? groups[0]?.territory.id ?? null,
  );
  const [selection, setSelection] = useState<SoldierId[]>([]);

  const group = groups.find((g) => g.territory.id === territoryId) ?? groups[0];
  const limitReached = selection.length >= SEQUESTRO_MAX_TARGETS;

  function toggle(id: SoldierId) {
    setSelection((current) => {
      if (current.includes(id)) return current.filter((s) => s !== id);
      if (current.length >= SEQUESTRO_MAX_TARGETS) return current;
      return [...current, id];
    });
  }

  function selectTerritory(id: TerritoryId) {
    setTerritoryId(id);
    setSelection([]);
  }

  if (!group) {
    return (
      <Modal title="Sequestro" onClose={onClose}>
        <p className="modal__lead">Não há soldados inimigos em território para capturar.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Sequestro"
      subtitle={`Selecione até ${SEQUESTRO_MAX_TARGETS} soldados de um time adversário`}
      onClose={onClose}
      tone="action"
      footer={
        <>
          <span className="modal__counter">
            {selection.length} / {SEQUESTRO_MAX_TARGETS} selecionados
          </span>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={selection.length === 0}
            onClick={() => onConfirm(selection)}
          >
            Executar extração
          </button>
        </>
      }
    >
      <div className="chooser" role="group" aria-label="Território inimigo">
        {groups.map(({ territory, soldiers }) => (
          <button
            key={territory.id as string}
            type="button"
            className={`chip${territory.id === group.territory.id ? ' is-on' : ''}`}
            onClick={() => selectTerritory(territory.id)}
          >
            {territory.name}
            <em>{soldiers.length}</em>
          </button>
        ))}
      </div>

      <p className="modal__lead">
        Tropas em <strong>{group.territory.name}</strong>. Toque para selecionar.
      </p>

      <ul className="soldier-grid">
        {group.soldiers.map((soldier, index) => {
          const picked = selection.includes(soldier.id);
          return (
            <li key={soldier.id as string}>
              <button
                type="button"
                className={`soldier${picked ? ' is-on' : ''}`}
                onClick={() => toggle(soldier.id)}
                disabled={!picked && limitReached}
                aria-pressed={picked}
              >
                <span aria-hidden="true">🪖</span>
                <span className="soldier__label">#{index + 1}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {limitReached && (
        <p className="modal__warning">
          Limite atingido: o Sequestro leva no máximo {SEQUESTRO_MAX_TARGETS} soldados.
        </p>
      )}
    </Modal>
  );
}
