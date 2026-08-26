import { useMemo } from 'react';
import type { GameState } from '../../game/types/game.types';
import type { Territory } from '../../game/types/territory.types';
import { getFaction } from '../../game/factions/faction.registry';
import { mockDiceFaces, mockDicePlan } from '../../mocks/prototype.mocks';
import { Die } from './Die';

export interface BattlePanelProps {
  state: GameState;
  from: Territory;
  to: Territory;
  amount: number;
  onAmountChange: (amount: number) => void;
  max: number;
  onAttack: () => void;
  onRetreat: () => void;
}

/**
 * Prévia da batalha. O ataque em si é declarado pelo motor existente
 * (`DECLARE_ATTACK`); os dados exibidos são MOCK VISUAL até a Etapa 3.
 */
export function BattlePanel({
  state,
  from,
  to,
  amount,
  onAmountChange,
  max,
  onAttack,
  onRetreat,
}: BattlePanelProps) {
  const attacker = from.controllerId ? state.players[from.controllerId as string] : null;
  const defender = to.controllerId ? state.players[to.controllerId as string] : null;
  const attackerFaction = attacker ? getFaction(attacker.factionId) : null;
  const defenderFaction = defender ? getFaction(defender.factionId) : null;

  const plan = mockDicePlan(amount + 1, to.garrison.length);
  const faces = useMemo(
    () => ({
      attacker: mockDiceFaces(plan.attacker),
      defender: mockDiceFaces(plan.defender),
    }),
    [plan.attacker, plan.defender],
  );

  return (
    <div className="battle-backdrop modal-backdrop" role="dialog" aria-modal="true" aria-label="Batalha">
      <div className="battle modal">
        <header className="battle__header">
          <h2 className="battle__title modal__title">Batalha</h2>
          <p className="battle__sub">Confirme a força de ataque</p>
        </header>

        <div className="battle__grid">
          <section className="battle__side is-attacker" style={{ ['--faction' as string]: attackerFaction?.color }}>
            <span className="battle__role">Atacante</span>
            <strong className="battle__faction">{attacker?.name}</strong>
            <span className="battle__territory">{from.name}</span>
            <span className="battle__troops">{from.garrison.length} tropas</span>
            <div className="battle__dice">
              {faces.attacker.map((face, i) => (
                <Die key={`a-${i}`} value={face} tone="attack" />
              ))}
            </div>
          </section>

          <div className="battle__versus" aria-hidden="true">
            <span>VS</span>
          </div>

          <section className="battle__side is-defender" style={{ ['--faction' as string]: defenderFaction?.color }}>
            <span className="battle__role">Defensor</span>
            <strong className="battle__faction">{defender?.name}</strong>
            <span className="battle__territory">{to.name}</span>
            <span className="battle__troops">{to.garrison.length} tropas</span>
            <div className="battle__dice">
              {faces.defender.map((face, i) => (
                <Die key={`d-${i}`} value={face} tone="defense" />
              ))}
            </div>
          </section>
        </div>

        <div className="battle__force">
          <span className="battle__force-label">Soldados enviados ao ataque</span>
          <div className="battle__force-controls">
            <button
              type="button"
              className="btn btn--round"
              onClick={() => onAmountChange(Math.max(1, amount - 1))}
              disabled={amount <= 1}
              aria-label="Diminuir"
            >
              −
            </button>
            <output className="battle__force-value">{amount}</output>
            <button
              type="button"
              className="btn btn--round"
              onClick={() => onAmountChange(Math.min(max, amount + 1))}
              disabled={amount >= max}
              aria-label="Aumentar"
            >
              +
            </button>
          </div>
          <span className="battle__hint">máximo {max} · a origem mantém ao menos 1 soldado</span>
        </div>

        <p className="battle__mock">
          Dados exibidos são prévia visual — a resolução completa chega na Etapa 3.
        </p>

        <footer className="battle__actions modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onRetreat}>
            Recuar
          </button>
          <button type="button" className="btn btn--danger" onClick={onAttack} disabled={max < 1}>
            Atacar
          </button>
        </footer>
      </div>
    </div>
  );
}
