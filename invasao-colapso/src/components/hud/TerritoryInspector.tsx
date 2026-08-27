import { useState } from 'react';
import type { GameState } from '../../game/types/game.types';
import type { TerritoryId } from '../../game/types/ids';
import { getFaction } from '../../game/factions/faction.registry';
import { regionOfTerritory, specialLinkBetween } from '../../game/map/regions';
import { TERRITORY_SEEDS } from '../../data/territories.seed';
import { activeModifiersFor } from '../../game/engine/modifiers';
import { visibleTroops } from '../../game/engine/selectors';
import { NumberStepper } from '../ui/NumberStepper';

export type InspectorAction =
  | { kind: 'REINFORCE'; territoryId: TerritoryId; amount: number }
  | { kind: 'ATTACK_FROM'; territoryId: TerritoryId }
  | { kind: 'SPECIAL_FROM'; territoryId: TerritoryId }
  | { kind: 'MOVE_FROM'; territoryId: TerritoryId }
  | { kind: 'MOVE_TO'; territoryId: TerritoryId; amount: number }
  | { kind: 'ATTACK_TO'; territoryId: TerritoryId }
  | { kind: 'SPECIAL_TO'; territoryId: TerritoryId; amount: number }
  | { kind: 'CLEAR' };

export interface TerritoryInspectorProps {
  state: GameState;
  territoryId: TerritoryId;
  originId: TerritoryId | null;
  canReinforce: boolean;
  canAttackFrom: boolean;
  canSpecialFrom: boolean;
  canMoveFrom: boolean;
  isAttackTarget: boolean;
  isMoveTarget: boolean;
  isSpecialTarget: boolean;
  maxMove: number;
  maxSpecial: number;
  onAction: (action: InspectorAction) => void;
}

const SEED_BY_ID = new Map(TERRITORY_SEEDS.map((seed) => [seed.id as string, seed]));

export function TerritoryInspector(props: TerritoryInspectorProps) {
  const { state, territoryId, originId } = props;
  const territory = state.territories[territoryId as string];
  const [amount, setAmount] = useState(1);
  if (!territory) return null;

  const seed = SEED_BY_ID.get(territoryId as string);
  const region = regionOfTerritory(territoryId);
  const controller = territory.controllerId
    ? state.players[territory.controllerId as string]
    : null;
  const faction = controller ? getFaction(controller.factionId) : null;
  const troops = visibleTroops(state, territory, state.turn.currentPlayerId);
  const modifiers = activeModifiersFor(state, territoryId);

  return (
    <section className="inspector" aria-label={`Território ${territory.name}`}>
      <header className="inspector__head">
        <div>
          <h3>{territory.name}</h3>
          <p className="inspector__region">{region?.name ?? '—'}</p>
        </div>
        <span
          className="inspector__owner"
          style={{ '--fc': faction?.color ?? '#6b7280' } as React.CSSProperties}
        >
          {controller ? `${faction?.symbol} ${controller.name}` : 'Neutro'}
        </span>
      </header>

      <dl className="inspector__facts">
        <div>
          <dt>Tropas</dt>
          <dd>{troops.label}</dd>
        </div>
        <div>
          <dt>Fronteiras</dt>
          <dd>{territory.neighbors.length}</dd>
        </div>
      </dl>

      <p className="inspector__flavor">{seed?.characteristic}</p>
      {seed?.poi ? (
        <p className="inspector__poi">★ Ponto de Interesse — {seed.poi.description}</p>
      ) : null}

      <div className="inspector__neighbors">
        <h4>Faz fronteira com</h4>
        <ul>
          {territory.neighbors.map((id) => {
            const neighbor = state.territories[id as string];
            const link = specialLinkBetween(territoryId, id);
            const owner = neighbor?.controllerId
              ? state.players[neighbor.controllerId as string]
              : null;
            const disabled = state.disabledLinks.some(
              (entry) =>
                (entry.a === territoryId && entry.b === id) ||
                (entry.b === territoryId && entry.a === id),
            );
            return (
              <li key={id as string} className={disabled ? 'is-off' : undefined}>
                <span
                  className="dot"
                  style={
                    {
                      '--fc': owner ? getFaction(owner.factionId).color : '#6b7280',
                    } as React.CSSProperties
                  }
                />
                {neighbor?.name}
                <b>{neighbor?.garrison.length ?? 0}</b>
                {link ? <em>{link.name}</em> : null}
              </li>
            );
          })}
        </ul>
      </div>

      {modifiers.length > 0 ? (
        <ul className="inspector__modifiers">
          {modifiers.map((modifier) => (
            <li key={modifier.id}>
              {modifier.attackerDiceReduction ? 'Atacante rola 1 dado a menos. ' : ''}
              {modifier.blockSpecialAttack ? 'Imune a Ataque Especial. ' : ''}
              {modifier.ignoreFirstLossPerRound ? 'Ignora a 1ª perda por rodada. ' : ''}
              {modifier.blockReinforce ? 'Sem reforço nem movimentação. ' : ''}
              <small>até a rodada {modifier.untilRound}</small>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="inspector__actions">
        {props.canReinforce ? (
          <div className="inspector__stepper">
            <NumberStepper
              value={Math.min(amount, state.turn.pendingReinforcements)}
              min={1}
              max={Math.max(1, state.turn.pendingReinforcements)}
              onChange={setAmount}
              label="Reforçar"
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={() =>
                props.onAction({
                  kind: 'REINFORCE',
                  territoryId,
                  amount: Math.min(amount, state.turn.pendingReinforcements),
                })
              }
            >
              Posicionar
            </button>
          </div>
        ) : null}

        {props.canAttackFrom ? (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => props.onAction({ kind: 'ATTACK_FROM', territoryId })}
          >
            Atacar a partir daqui
          </button>
        ) : null}

        {props.canSpecialFrom ? (
          <button
            type="button"
            className="btn btn--warn"
            onClick={() => props.onAction({ kind: 'SPECIAL_FROM', territoryId })}
          >
            Transporte Especial daqui
          </button>
        ) : null}

        {props.canMoveFrom ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => props.onAction({ kind: 'MOVE_FROM', territoryId })}
          >
            Mover a partir daqui
          </button>
        ) : null}

        {props.isAttackTarget ? (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => props.onAction({ kind: 'ATTACK_TO', territoryId })}
          >
            Declarar ataque contra {territory.name}
          </button>
        ) : null}

        {props.isSpecialTarget ? (
          <div className="inspector__stepper">
            <NumberStepper
              value={Math.min(amount, props.maxSpecial)}
              min={1}
              max={Math.max(1, props.maxSpecial)}
              onChange={setAmount}
              label="Enviar"
            />
            <button
              type="button"
              className="btn btn--warn"
              onClick={() =>
                props.onAction({
                  kind: 'SPECIAL_TO',
                  territoryId,
                  amount: Math.min(amount, props.maxSpecial),
                })
              }
            >
              Lançar ataque
            </button>
          </div>
        ) : null}

        {props.isMoveTarget ? (
          <div className="inspector__stepper">
            <NumberStepper
              value={Math.min(amount, props.maxMove)}
              min={1}
              max={Math.max(1, props.maxMove)}
              onChange={setAmount}
              label="Mover"
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={() =>
                props.onAction({
                  kind: 'MOVE_TO',
                  territoryId,
                  amount: Math.min(amount, props.maxMove),
                })
              }
            >
              Confirmar
            </button>
          </div>
        ) : null}

        {originId ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => props.onAction({ kind: 'CLEAR' })}
          >
            Cancelar seleção
          </button>
        ) : null}
      </div>
    </section>
  );
}
