import type { GameState } from '../../game/types/game.types';
import { getFaction } from '../../game/factions/faction.registry';
import { seatedPlayers, transportStatus, troopsOf } from '../../game/engine/selectors';
import { territoriesOf } from '../../game/map/territory';
import { neutralHandSize } from '../../game/deck/deck';

export interface TopBarProps {
  state: GameState;
  onOpenMission: () => void;
  onExit: () => void;
}

export function TopBar({ state, onOpenMission, onExit }: TopBarProps) {
  const player = state.players[state.turn.currentPlayerId as string];
  const faction = getFaction(player.factionId);
  const transport = transportStatus(state, player.id);
  const territories = territoriesOf(state, player.id).length;

  return (
    <header className="topbar" style={{ '--fc': faction.color } as React.CSSProperties}>
      <div className="topbar__identity">
        <span className="topbar__symbol" aria-hidden="true">
          {faction.symbol}
        </span>
        <div>
          <div className="topbar__player">{player.name}</div>
          <div className="topbar__faction">{faction.name}</div>
        </div>
      </div>

      <dl className="topbar__stats">
        <div>
          <dt>Rodada</dt>
          <dd>{state.turn.number}</dd>
        </div>
        <div>
          <dt>Territórios</dt>
          <dd>{territories}</dd>
        </div>
        <div>
          <dt>Tropas</dt>
          <dd>{troopsOf(state, player.id)}</dd>
        </div>
        <div>
          <dt>Cartas</dt>
          <dd>{neutralHandSize(state, player.id)}</dd>
        </div>
        <div>
          <dt>Ataque</dt>
          <dd className={state.turn.commonAttackUsed ? 'is-used' : 'is-ready'}>
            {state.turn.commonAttackUsed ? 'usado' : 'disponível'}
          </dd>
        </div>
        <div>
          <dt>Especial</dt>
          <dd className={transport.available ? 'is-ready' : 'is-used'}>
            {transport.used
              ? 'usado'
              : transport.blocked
                ? 'bloqueado'
                : transport.free
                  ? 'livre'
                  : `${transport.charges}/${transport.max}`}
          </dd>
        </div>
      </dl>

      <div className="topbar__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenMission}>
          🎯 Missão
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
          Sair
        </button>
      </div>

      <div className="topbar__players">
        {seatedPlayers(state).map((p) => {
          const f = getFaction(p.factionId);
          const active = p.id === state.turn.currentPlayerId;
          return (
            <span
              key={p.id as string}
              className={`pstrip${active ? ' pstrip--on' : ''}${
                p.status === 'ELIMINATED' ? ' pstrip--out' : ''
              }`}
              style={{ '--fc': f.color } as React.CSSProperties}
              title={`${p.name} · ${f.name}`}
            >
              <b>{f.symbol}</b>
              {territoriesOf(state, p.id).length}
            </span>
          );
        })}
      </div>
    </header>
  );
}
