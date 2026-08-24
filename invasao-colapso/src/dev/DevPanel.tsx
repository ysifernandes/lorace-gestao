import { useState } from 'react';
import type { GameState } from '../game/types/game.types';
import type { GameAction } from '../game/engine/actions';
import type { PlayerId, TerritoryId } from '../game/types/ids';
import { SEQUESTRO_CARD_ID } from '../game/cards/sequestro.card';
import { allPlayers, allTerritories } from '../game/engine/selectors';

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
