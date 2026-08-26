import type { GameState } from '../../game/types/game.types';
import type { Territory } from '../../game/types/territory.types';
import { getFaction } from '../../game/factions/faction.registry';
import { maxMovableFrom, neighborsOf } from '../../game/map/adjacency';

export interface TerritorySheetProps {
  state: GameState;
  territory: Territory;
  canMove: boolean;
  canAttack: boolean;
  onMove: () => void;
  onAttack: () => void;
  onCancel: () => void;
  hint?: string;
}

/** Ficha do território: abre como painel lateral no desktop e folha no celular. */
export function TerritorySheet({
  state,
  territory,
  canMove,
  canAttack,
  onMove,
  onAttack,
  onCancel,
  hint,
}: TerritorySheetProps) {
  const controller = territory.controllerId ? state.players[territory.controllerId as string] : null;
  const faction = controller ? getFaction(controller.factionId) : null;
  const neighbors = neighborsOf(state, territory.id);

  return (
    <section
      className="sheet panel panel--territory"
      aria-label={`Território ${territory.name}`}
      style={{ ['--faction' as string]: faction?.color ?? '#5d6a7f' }}
    >
      <header className="sheet__head">
        <div>
          <span className="sheet__eyebrow">{territory.region ?? 'Setor'}</span>
          <h2 className="sheet__title panel__title">{territory.name}</h2>
          <p className="sheet__owner">
            <span className="sheet__dot" aria-hidden="true" />
            {controller?.name ?? 'Neutro'}
            {faction ? ` · ${faction.name}` : ''}
          </p>
        </div>
        <div className="sheet__troops">
          <strong>{territory.garrison.length}</strong>
          <span>tropas</span>
        </div>
      </header>

      <dl className="sheet__facts">
        <div>
          <dt>Estado</dt>
          <dd>{territory.status === 'CONTESTED' ? 'Em disputa' : 'Estável'}</dd>
        </div>
        <div>
          <dt>Movíveis</dt>
          <dd>{maxMovableFrom(state, territory.id)}</dd>
        </div>
        <div>
          <dt>Fronteiras</dt>
          <dd>{neighbors.length}</dd>
        </div>
      </dl>

      <div className="sheet__neighbors">
        <h3>Fronteiras</h3>
        <ul>
          {neighbors.map((neighbor) => {
            const owner = neighbor.controllerId
              ? state.players[neighbor.controllerId as string]
              : null;
            const neighborFaction = owner ? getFaction(owner.factionId) : null;
            const hostile = !!owner && owner.id !== territory.controllerId;
            return (
              <li key={neighbor.id as string} className={hostile ? 'is-hostile' : 'is-allied'}>
                <span
                  className="sheet__dot"
                  style={{ background: neighborFaction?.color ?? '#5d6a7f' }}
                  aria-hidden="true"
                />
                {neighbor.name}
                <em>{neighbor.garrison.length}</em>
              </li>
            );
          })}
        </ul>
      </div>

      {hint && <p className="sheet__hint panel__hint">{hint}</p>}

      <div className="sheet__actions panel__actions">
        <button type="button" className="btn btn--primary" onClick={onMove} disabled={!canMove}>
          Mover
        </button>
        <button type="button" className="btn btn--danger" onClick={onAttack} disabled={!canAttack}>
          Atacar
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
