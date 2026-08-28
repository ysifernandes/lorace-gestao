import type { GameState } from '../../game/types/game.types';
import { PHASE_ORDER, PHASE_SHORT, PHASE_DESCRIPTIONS, PHASE_LABELS } from '../../game/turns/phases';

export interface PhaseBarProps {
  state: GameState;
  onAdvance: () => void;
}

export function PhaseBar({ state, onAdvance }: PhaseBarProps) {
  const current = state.turn.phase;
  const blocked =
    state.turn.phase === 'REFORCO' && state.turn.pendingReinforcements > 0
      ? `Distribua ${state.turn.pendingReinforcements} reforço(s)`
      : null;

  return (
    <div className="phasebar">
      <ol className="phasebar__steps">
        {PHASE_ORDER.map((phase, index) => (
          <li
            key={phase}
            className={
              'phasebar__step' +
              (phase === current ? ' is-current' : '') +
              (PHASE_ORDER.indexOf(current) > index ? ' is-done' : '')
            }
            title={PHASE_DESCRIPTIONS[phase]}
          >
            {PHASE_SHORT[phase]}
          </li>
        ))}
      </ol>
      <div className="phasebar__now">
        <strong>{PHASE_LABELS[current]}</strong>
        <span>{PHASE_DESCRIPTIONS[current]}</span>
      </div>
      <button
        type="button"
        className="btn btn--primary"
        onClick={onAdvance}
        disabled={Boolean(blocked)}
        title={blocked ?? undefined}
      >
        {current === 'FIM_TURNO' ? 'Finalizar turno' : 'Avançar fase →'}
      </button>
      {blocked ? <p className="phasebar__blocked">{blocked}</p> : null}
    </div>
  );
}
