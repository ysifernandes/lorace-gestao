import type { GameState } from '../../game/types/game.types';
import type { Territory } from '../../game/types/territory.types';
import { controllerName } from '../../game/engine/selectors';
import { maxMovableFrom, neighborsOf } from '../../game/map/adjacency';
import { getFaction } from '../../game/factions/faction.registry';

export interface TerritoryPanelProps {
  state: GameState;
  territory: Territory;
  canMove: boolean;
  canAttack: boolean;
  onMove: () => void;
  onAttack: () => void;
  onCancel: () => void;
  hint?: string;
}

export function TerritoryPanel({
  state,
  territory,
  canMove,
  canAttack,
  onMove,
  onAttack,
  onCancel,
  hint,
}: TerritoryPanelProps) {
  const controller = territory.controllerId
    ? state.players[territory.controllerId as string]
    : null;
  const faction = controller ? getFaction(controller.factionId) : null;
  const neighbors = neighborsOf(state, territory.id);

  return (
    <section className="panel panel--territory" aria-label={`Território ${territory.name}`}>
      <header className="panel__header">
        <div>
          <h2 className="panel__title">{territory.name}</h2>
          <p className="panel__sub">
            <span
              className="dot"
              style={{ background: faction?.color ?? '#5b6472' }}
              aria-hidden="true"
            />
            {controllerName(state, territory)}
            {faction ? ` · ${faction.name}` : ''}
          </p>
        </div>
        <div className="panel__troops">
          <strong>{territory.garrison.length}</strong>
          <span>tropas</span>
        </div>
      </header>

      <dl className="panel__facts">
        <div>
          <dt>Região</dt>
          <dd>{territory.region ?? '—'}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{territory.status === 'CONTESTED' ? 'Em disputa' : 'Estável'}</dd>
        </div>
        <div>
          <dt>Movíveis</dt>
          <dd>{maxMovableFrom(state, territory.id)}</dd>
        </div>
      </dl>

      <div className="panel__neighbors">
        <h3>Fronteiras</h3>
        <ul>
          {neighbors.map((neighbor) => (
            <li key={neighbor.id as string}>
              <span
                className="dot"
                style={{
                  background: neighbor.controllerId
                    ? getFaction(
                        state.players[neighbor.controllerId as string].factionId,
                      ).color
                    : '#5b6472',
                }}
                aria-hidden="true"
              />
              {neighbor.name}
              <em>{neighbor.garrison.length}</em>
            </li>
          ))}
        </ul>
      </div>

      {hint && <p className="panel__hint">{hint}</p>}

      <div className="panel__actions">
        <button type="button" className="btn btn--primary" onClick={onMove} disabled={!canMove}>
          Mover
        </button>
        <button type="button" className="btn btn--danger" onClick={onAttack} disabled={!canAttack}>
          Atacar
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
