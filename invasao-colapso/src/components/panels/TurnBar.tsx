import type { GameState } from '../../game/types/game.types';
import { getFaction } from '../../game/factions/faction.registry';
import { PHASE_LABELS, PHASE_ORDER } from '../../game/turns/phases';
import { currentPlayer, troopsOf } from '../../game/engine/selectors';
import { GAME_TITLE } from '../../data/lore';

export interface TurnBarProps {
  state: GameState;
  onAdvancePhase: () => void;
  onEndTurn: () => void;
  blocked: boolean;
}

export function TurnBar({ state, onAdvancePhase, onEndTurn, blocked }: TurnBarProps) {
  const player = currentPlayer(state);
  const faction = getFaction(player.factionId);

  return (
    <header className="turnbar">
      <div className="turnbar__identity">
        <h1 className="turnbar__title">{GAME_TITLE}</h1>
        <p className="turnbar__sub">Etapa 2 — Mapa, Conquista e Movimentação</p>
      </div>

      <div className="turnbar__status">
        <div className="stat">
          <span className="stat__label">Turno</span>
          <strong className="stat__value">{state.turn.number}</strong>
        </div>
        <div className="stat stat--player" style={{ borderColor: faction.color }}>
          <span className="stat__label">Jogador</span>
          <strong className="stat__value" style={{ color: faction.color }}>
            {player.name}
          </strong>
          <span className="stat__meta">
            {faction.name} · {player.territoryIds.length} territórios ·{' '}
            {troopsOf(state, player.id)} tropas
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Fase</span>
          <strong className="stat__value">{PHASE_LABELS[state.turn.phase]}</strong>
        </div>
      </div>

      <ol className="phases" aria-label="Fases do turno">
        {PHASE_ORDER.map((phase) => (
          <li
            key={phase}
            className={`phases__item${phase === state.turn.phase ? ' is-active' : ''}`}
          >
            {PHASE_LABELS[phase]}
          </li>
        ))}
      </ol>

      <div className="turnbar__actions">
        <button type="button" className="btn btn--primary" onClick={onAdvancePhase} disabled={blocked}>
          Avançar fase
        </button>
        <button type="button" className="btn" onClick={onEndTurn} disabled={blocked}>
          Finalizar turno
        </button>
      </div>
    </header>
  );
}
