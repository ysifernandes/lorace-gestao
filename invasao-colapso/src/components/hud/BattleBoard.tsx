import type { GameState } from '../../game/types/game.types';
import { getFaction } from '../../game/factions/faction.registry';
import { planBattle } from '../../game/combat/battle';
import { Die } from './Die';

export interface BattleBoardProps {
  state: GameState;
  onRoll: () => void;
  onRetreat: () => void;
}

/**
 * Painel de batalha. Uma batalha pode ter várias rodadas de dados contra o
 * MESMO território e continua sendo UM ÚNICO ataque — o painel deixa isso
 * explícito no contador de rodadas.
 */
export function BattleBoard({ state, onRoll, onRetreat }: BattleBoardProps) {
  const attack = state.pendingAttack;
  if (!attack) return null;

  const from = state.territories[attack.fromTerritoryId as string];
  const to = state.territories[attack.toTerritoryId as string];
  const attacker = state.players[attack.attackerPlayerId as string];
  const defender = state.players[attack.defenderPlayerId as string];
  const plan = planBattle(state, attack);
  const last = attack.rounds[attack.rounds.length - 1];

  return (
    <section className="battle" aria-label="Batalha em andamento">
      <header className="battle__head">
        <span className="battle__kind">
          {attack.kind === 'SPECIAL' ? 'Ataque Especial' : 'Ataque Comum'}
        </span>
        <span className="battle__rounds">
          Rodada {attack.rounds.length + 1} · mesmo ataque
        </span>
      </header>

      <div className="battle__sides">
        <div
          className="battle__side battle__side--attacker"
          style={{ '--fc': getFaction(attacker.factionId).color } as React.CSSProperties}
        >
          <div className="battle__role">Atacante</div>
          <div className="battle__territory">{from?.name}</div>
          <div className="battle__faction">{getFaction(attacker.factionId).name}</div>
          <div className="battle__troops">
            {plan.attackerTroops} <small>tropas</small>
          </div>
          <div className="battle__dice">
            {last
              ? last.attackerDice.map((value, i) => <Die key={i} value={value} />)
              : Array.from({ length: plan.attackerDice }, (_, i) => <Die key={i} value={null} />)}
          </div>
          <div className="battle__dicecount">{plan.attackerDice} dado(s)</div>
        </div>

        <div className="battle__vs">VS</div>

        <div
          className="battle__side battle__side--defender"
          style={{ '--fc': getFaction(defender.factionId).color } as React.CSSProperties}
        >
          <div className="battle__role">Defensor</div>
          <div className="battle__territory">{to?.name}</div>
          <div className="battle__faction">{getFaction(defender.factionId).name}</div>
          <div className="battle__troops">
            {plan.defenderTroops} <small>tropas</small>
          </div>
          <div className="battle__dice">
            {last
              ? last.defenderDice.map((value, i) => <Die key={i} value={value} />)
              : Array.from({ length: plan.defenderDice }, (_, i) => <Die key={i} value={null} />)}
          </div>
          <div className="battle__dicecount">{plan.defenderDice} dado(s)</div>
        </div>
      </div>

      {last ? (
        <ul className="battle__result">
          {last.comparisons.map((comparison, i) => (
            <li key={i} className={comparison.winner === 'ATTACKER' ? 'is-attacker' : 'is-defender'}>
              <span>{comparison.attacker}</span>
              <em>×</em>
              <span>{comparison.defender}</span>
              <b>{comparison.winner === 'ATTACKER' ? 'atacante' : 'defensor'}</b>
            </li>
          ))}
          <li className="battle__losses">
            Atacante −{last.attackerLosses} · Defensor −{last.defenderLosses}
          </li>
        </ul>
      ) : (
        <p className="battle__hint">
          Empate favorece o defensor. Cada comparação perdida elimina 1 soldado.
        </p>
      )}

      {attack.attackerDiceCap < 3 ? (
        <p className="battle__note">
          O atacante está limitado a {attack.attackerDiceCap} dado(s) nesta fronteira.
        </p>
      ) : null}

      <div className="battle__actions">
        <button type="button" className="btn btn--danger" onClick={onRoll}>
          Rolar dados
        </button>
        <button type="button" className="btn btn--ghost" onClick={onRetreat}>
          Recuar
        </button>
      </div>
    </section>
  );
}
