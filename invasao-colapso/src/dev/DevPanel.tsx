import { useState } from 'react';
import type { GameState } from '../game/types/game.types';
import type { GameAction } from '../game/engine/actions';
import type { PlayerId, TerritoryId } from '../game/types/ids';
import { SEQUESTRO_CARD_ID } from '../game/cards/sequestro.card';
import { abilityViews, allPlayers, allTerritories, pendingEffects } from '../game/engine/selectors';
import { OPERACAO_AEREA_ID } from '../game/abilities/humanos/operacaoAerea';
import { BALANCE } from '../game/config/balance';
import { territoriesOf } from '../game/map/territory';

/**
 * ⚠️ PAINEL DE DESENVOLVIMENTO — TEMPORÁRIO ⚠️
 *
 * Isolado de propósito: só fala com o motor por AÇÕES, exatamente como a UI
 * normal. Nenhum outro arquivo importa este módulo além do ponto de montagem,
 * então apagar a pasta `src/dev` remove o painel sem quebrar o jogo.
 */
export interface DevPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => boolean;
}

export function DevPanel({ state, dispatch }: DevPanelProps) {
  const [open, setOpen] = useState(false);
  const [territoryId, setTerritoryId] = useState<TerritoryId>(
    allTerritories(state)[0]?.id as TerritoryId,
  );
  const [amount, setAmount] = useState(1);
  const territories = allTerritories(state);
  const players = allPlayers(state);
  const territory = state.territories[territoryId as string] ?? territories[0];
  const abilities = abilityViews(state, state.turn.currentPlayerId);
  const pending = pendingEffects(state);

  /**
   * Entrega territórios ao adversário até o jogador atual cair no limiar
   * da Sobrevivência, e passa o turno para o início seguinte.
   */
  function forceSurvival() {
    const limite = BALANCE.abilities.sobrevivencia.maxTerritories;
    const opponent = players.find((p) => p.id !== state.turn.currentPlayerId);
    if (!opponent) return;
    const owned = territoriesOf(state, state.turn.currentPlayerId);
    for (const extra of owned.slice(limite)) {
      dispatch({ type: 'SET_CONTROLLER', territoryId: extra.id, playerId: opponent.id });
    }
    // Dois fins de turno devolvem a vez ao mesmo jogador.
    dispatch({ type: 'END_TURN' });
    dispatch({ type: 'END_TURN' });
  }

  /** Leva o jogo até a fase da Operação Aérea e garante tropas na origem. */
  function testAirlift() {
    const owned = territoriesOf(state, state.turn.currentPlayerId);
    const origin = owned[0];
    if (!origin) return;
    dispatch({ type: 'ADD_SOLDIERS', territoryId: origin.id, amount: 3 });
    for (let i = 0; i < 6; i += 1) {
      dispatch({ type: 'ADVANCE_PHASE' });
    }
    dispatch({ type: 'DEV_RESET_ABILITY', playerId: state.turn.currentPlayerId, abilityId: OPERACAO_AEREA_ID });
  }

  if (!open) {
    return (
      <button type="button" className="dev-toggle" onClick={() => setOpen(true)}>
        DEV
      </button>
    );
  }

  return (
    <aside className="dev-panel" aria-label="Painel de desenvolvimento">
      <header className="dev-panel__header">
        <strong>PAINEL DEV</strong>
        <span className="dev-panel__note">temporário</span>
        <button type="button" className="btn btn--icon" onClick={() => setOpen(false)} aria-label="Fechar painel DEV">
          ✕
        </button>
      </header>

      <div className="dev-panel__row">
        <label htmlFor="dev-territory">Território</label>
        <select
          id="dev-territory"
          value={territoryId as string}
          onChange={(event) => setTerritoryId(event.target.value as TerritoryId)}
        >
          {territories.map((t) => (
            <option key={t.id as string} value={t.id as string}>
              {t.name} ({t.garrison.length})
            </option>
          ))}
        </select>
      </div>

      <div className="dev-panel__row">
        <label htmlFor="dev-amount">Quantidade</label>
        <input
          id="dev-amount"
          type="number"
          min={1}
          max={20}
          value={amount}
          onChange={(event) => setAmount(Math.max(1, Number(event.target.value) || 1))}
        />
      </div>

      <div className="dev-panel__grid">
        <button
          type="button"
          onClick={() => dispatch({ type: 'ADD_SOLDIERS', territoryId, amount })}
        >
          + tropas
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'REMOVE_SOLDIERS', territoryId, amount })}
        >
          − tropas
        </button>
        <button type="button" onClick={() => dispatch({ type: 'ADVANCE_PHASE' })}>
          Avançar fase
        </button>
        <button type="button" onClick={() => dispatch({ type: 'END_TURN' })}>
          Avançar turno
        </button>
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'GRANT_CARD',
              playerId: state.turn.currentPlayerId,
              definitionId: SEQUESTRO_CARD_ID,
            })
          }
        >
          + carta Sequestro
        </button>
        <button
          type="button"
          className="is-danger"
          onClick={() => dispatch({ type: 'DEV_WIN_ATTACK' })}
          disabled={state.pendingAttack?.status !== 'DECLARED'}
        >
          Vencer ataque
        </button>
      </div>

      <div className="dev-panel__row">
        <label htmlFor="dev-controller">Controlador de {territory?.name}</label>
        <select
          id="dev-controller"
          value={(territory?.controllerId as string) ?? ''}
          onChange={(event) =>
            dispatch({
              type: 'SET_CONTROLLER',
              territoryId,
              playerId: (event.target.value || null) as PlayerId | null,
            })
          }
        >
          <option value="">Neutro</option>
          {players.map((p) => (
            <option key={p.id as string} value={p.id as string}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="dev-panel__row">
        <label htmlFor="dev-current">Jogador atual</label>
        <select
          id="dev-current"
          value={state.turn.currentPlayerId as string}
          onChange={(event) =>
            dispatch({ type: 'SET_CURRENT_PLAYER', playerId: event.target.value as PlayerId })
          }
        >
          {players.map((p) => (
            <option key={p.id as string} value={p.id as string}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <hr className="dev-panel__rule" />
      <strong className="dev-panel__section">Habilidades</strong>

      {abilities.length === 0 ? (
        <p className="dev-panel__note">A facção do jogador atual não tem habilidades.</p>
      ) : (
        abilities.map((view) => (
          <div key={view.definition.id} className="dev-panel__ability">
            <label>
              <input
                type="checkbox"
                checked={view.runtime.enabled}
                onChange={(event) =>
                  dispatch({
                    type: 'DEV_SET_ABILITY_ENABLED',
                    playerId: state.turn.currentPlayerId,
                    abilityId: view.definition.id,
                    enabled: event.target.checked,
                  })
                }
              />
              {view.definition.name}
            </label>
            <span className="dev-panel__note">
              {view.status}
              {view.chargesRemaining >= 0 ? ` · ${view.chargesRemaining} carga(s)` : ''}
            </span>
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'DEV_RESET_ABILITY',
                  playerId: state.turn.currentPlayerId,
                  abilityId: view.definition.id,
                })
              }
            >
              Restaurar cargas/recarga
            </button>
          </div>
        ))
      )}

      <div className="dev-panel__grid">
        <button type="button" onClick={forceSurvival} title="Reduz seus territórios até a habilidade ativar">
          Forçar Sobrevivência
        </button>
        <button type="button" onClick={testAirlift}>
          Testar Op. Aérea
        </button>
      </div>

      <hr className="dev-panel__rule" />
      <strong className="dev-panel__section">
        Fila de efeitos ({pending.length} pendente{pending.length === 1 ? '' : 's'})
      </strong>
      <ol className="dev-panel__queue">
        {pending.map((entry) => (
          <li key={entry.id}>
            <code>{entry.priority}</code> {entry.effect.kind} ← {entry.source.label ?? entry.source.id}
          </li>
        ))}
        {state.effectHistory.slice(0, 5).map((entry) => (
          <li key={entry.id} className={`is-${entry.status.toLowerCase()}`}>
            <code>{entry.status === 'RESOLVED' ? '✓' : '✕'}</code> {entry.effect.kind}
            {entry.result ? ` — ${entry.result}` : ''}
          </li>
        ))}
        {pending.length === 0 && state.effectHistory.length === 0 && (
          <li className="dev-panel__note">Fila vazia.</li>
        )}
      </ol>
      <button type="button" onClick={() => dispatch({ type: 'DEV_CLEAR_EFFECTS' })}>
        Limpar efeitos pendentes
      </button>

      <hr className="dev-panel__rule" />
      <button
        type="button"
        className="dev-panel__reset"
        onClick={() => {
          if (window.confirm('Resetar a partida? O save local será apagado.')) {
            dispatch({ type: 'NEW_GAME' });
          }
        }}
      >
        Resetar partida
      </button>
    </aside>
  );
}
