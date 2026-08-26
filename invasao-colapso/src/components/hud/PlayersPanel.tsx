import type { GameState } from '../../game/types/game.types';
import { getFaction } from '../../game/factions/faction.registry';
import { allPlayers, handOf, troopsOf } from '../../game/engine/selectors';

/** Placar das forças em disputa. As cartas do adversário nunca são reveladas. */
export function PlayersPanel({ state }: { state: GameState }) {
  const players = allPlayers(state);
  const currentId = state.turn.currentPlayerId;

  return (
    <section className="forces" aria-label="Forças em disputa">
      {players.map((player, index) => {
        const faction = getFaction(player.factionId);
        const isCurrent = player.id === currentId;
        const cards = handOf(state, player.id).length;
        return (
          <div key={player.id as string} className="forces__slot">
            {index > 0 && <span className="forces__versus" aria-hidden="true">VS</span>}
            <article
              className={`force${isCurrent ? ' is-active' : ''}`}
              style={{ ['--faction' as string]: faction.color }}
            >
              <header className="force__head">
                <span className="force__symbol" aria-hidden="true">
                  {faction.symbol}
                </span>
                <div>
                  <strong className="force__name">{player.name}</strong>
                  <span className="force__faction">{faction.name}</span>
                </div>
              </header>
              <dl className="force__stats">
                <div>
                  <dt>Territórios</dt>
                  <dd>{player.territoryIds.length}</dd>
                </div>
                <div>
                  <dt>Tropas</dt>
                  <dd>{troopsOf(state, player.id)}</dd>
                </div>
                <div>
                  <dt>Cartas</dt>
                  <dd>{isCurrent ? cards : '?'}</dd>
                </div>
              </dl>
            </article>
          </div>
        );
      })}
    </section>
  );
}
