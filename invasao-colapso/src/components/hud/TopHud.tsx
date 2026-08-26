import type { GameState } from '../../game/types/game.types';
import { getFaction } from '../../game/factions/faction.registry';
import { PHASE_LABELS, PHASE_ORDER } from '../../game/turns/phases';
import { currentPlayer } from '../../game/engine/selectors';

export interface TopHudProps {
  state: GameState;
  onAdvancePhase: () => void;
  onEndTurn: () => void;
  blocked: boolean;
}

/** Faixa de comando: identidade, jogador da vez, turno e trilha de fases. */
export function TopHud({ state, onAdvancePhase, onEndTurn, blocked }: TopHudProps) {
  const player = currentPlayer(state);
  const faction = getFaction(player.factionId);

  return (
    <header className="hud turnbar">
      <div className="hud__brand">
        <span className="hud__mark" aria-hidden="true" />
        <div>
          <h1 className="hud__title">
            Invasão<span>: Colapso</span>
          </h1>
          <p className="hud__tagline">Protocolo de contenção ativo</p>
        </div>
      </div>

      <div className="hud__status turnbar__status">
        <div className="hud__chip stat">
          <span className="hud__label stat__label">Turno</span>
          <strong className="hud__value stat__value">
            {String(state.turn.number).padStart(2, '0')}
          </strong>
        </div>
        <div
          className="hud__chip hud__chip--player stat stat--player"
          style={{ ['--faction' as string]: faction.color }}
        >
          <span className="hud__label stat__label">Comando</span>
          <strong className="hud__value stat__value" style={{ color: faction.color }}>
            {player.name}
          </strong>
        </div>
        <div className="hud__chip stat">
          <span className="hud__label stat__label">Fase</span>
          <strong className="hud__value stat__value">{PHASE_LABELS[state.turn.phase]}</strong>
        </div>
      </div>

      <ol className="phase-track phases" aria-label="Fases do turno">
        {PHASE_ORDER.map((phase, index) => {
          const active = phase === state.turn.phase;
          const past = PHASE_ORDER.indexOf(state.turn.phase) > index;
          return (
            <li
              key={phase}
              className={`phase-track__item phases__item${active ? ' is-active' : ''}${past ? ' is-past' : ''}`}
            >
              <span className="phase-track__dot" aria-hidden="true" />
              {PHASE_LABELS[phase]}
            </li>
          );
        })}
      </ol>

      <div className="hud__actions">
        <button type="button" className="btn btn--primary" onClick={onAdvancePhase} disabled={blocked}>
          Avançar fase
        </button>
        <button type="button" className="btn btn--ghost" onClick={onEndTurn} disabled={blocked}>
          Finalizar turno
        </button>
      </div>
    </header>
  );
}
