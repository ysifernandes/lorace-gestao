import { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { getFaction } from '../game/factions/faction.registry';
import { seatedPlayers } from '../game/engine/selectors';
import { listCollapseEvents, currentChance } from '../game/collapse/collapseEngine';
import { listMissions } from '../game/missions/missionEngine';
import { listCardDefinitions } from '../game/cards/card.registry';
import { TURN_PHASES } from '../game/types/turn.types';
import { PHASE_LABELS } from '../game/turns/phases';
import { territoriesOf } from '../game/map/territory';
import { validateState } from '../game/engine/invariants';
import type { CardDefinitionId, PlayerId, TerritoryId } from '../game/types/ids';
import { allAssetsNeeded } from '../view/assetsNeeded';
import { listFactions } from '../game/factions/faction.registry';

type Tab = 'PARTIDA' | 'MAPA' | 'CARTAS' | 'MISSOES' | 'COLAPSO' | 'ESTADO' | 'ARTE';

/**
 * PAINEL DEV — isolado e removível.
 *
 * Nenhuma regra vive aqui: tudo passa pelas mesmas ações do motor. Remover
 * este componente do MatchScreen desativa o modo DEV por inteiro.
 */
export function DevPanel() {
  const { state, dispatch, forcedDice, setForcedDice } = useGame();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('PARTIDA');
  const [target, setTarget] = useState<TerritoryId | ''>('');

  const players = seatedPlayers(state);
  const current = state.turn.currentPlayerId;
  const problems = validateState(state);

  if (!open) {
    return (
      <button type="button" className="dev-toggle" onClick={() => setOpen(true)} title="Modo DEV">
        DEV
      </button>
    );
  }

  return (
    <div className="dev">
      <header className="dev__head">
        <strong>Modo DEV</strong>
        <button type="button" className="btn btn--icon" onClick={() => setOpen(false)}>
          ✕
        </button>
      </header>

      <nav className="dev__tabs">
        {(['PARTIDA', 'MAPA', 'CARTAS', 'MISSOES', 'COLAPSO', 'ESTADO', 'ARTE'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={`dev__tab${tab === item ? ' is-on' : ''}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="dev__body">
        {tab === 'PARTIDA' ? (
          <>
            <h4>Jogador do turno</h4>
            <div className="dev__row">
              {players.map((player) => (
                <button
                  key={player.id as string}
                  type="button"
                  className={`chip${player.id === current ? ' chip--on' : ''}`}
                  onClick={() => dispatch({ type: 'SET_CURRENT_PLAYER', playerId: player.id })}
                  disabled={player.status !== 'ACTIVE'}
                >
                  {getFaction(player.factionId).symbol} {player.name}
                </button>
              ))}
            </div>

            <h4>Fase</h4>
            <div className="dev__row">
              {TURN_PHASES.map((phase) => (
                <button
                  key={phase}
                  type="button"
                  className={`chip${state.turn.phase === phase ? ' chip--on' : ''}`}
                  onClick={() => dispatch({ type: 'DEV_SET_PHASE', phase })}
                >
                  {PHASE_LABELS[phase]}
                </button>
              ))}
            </div>

            <div className="dev__row">
              <button type="button" className="btn btn--sm" onClick={() => dispatch({ type: 'ADVANCE_PHASE' })}>
                Avançar fase
              </button>
              <button type="button" className="btn btn--sm" onClick={() => dispatch({ type: 'END_TURN' })}>
                Encerrar turno
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => dispatch({ type: 'NEW_GAME', options: { playerCount: players.length } })}
              >
                Resetar partida
              </button>
            </div>

            <h4>Transporte Especial</h4>
            <div className="dev__row">
              {players.map((player) => (
                <button
                  key={player.id as string}
                  type="button"
                  className="chip"
                  onClick={() =>
                    dispatch({
                      type: 'DEV_SET_TRANSPORT',
                      playerId: player.id,
                      charges: player.transportCharges > 0 ? 0 : 1,
                    })
                  }
                >
                  {player.name}: {player.transportCharges}
                </button>
              ))}
            </div>

            <h4>Dados forçados</h4>
            <div className="dev__row">
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip${forcedDice?.[0] === value ? ' chip--on' : ''}`}
                  onClick={() => setForcedDice([value])}
                >
                  {value}
                </button>
              ))}
              <button type="button" className="chip" onClick={() => setForcedDice(null)}>
                aleatório
              </button>
            </div>

            <h4>Eliminação e vitória</h4>
            <div className="dev__row">
              {players.map((player) => (
                <button
                  key={player.id as string}
                  type="button"
                  className="chip"
                  disabled={player.status !== 'ACTIVE'}
                  onClick={() => dispatch({ type: 'DEV_ELIMINATE_PLAYER', playerId: player.id })}
                >
                  Eliminar {player.name}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                onClick={() => dispatch({ type: 'DEV_COMPLETE_MISSION', playerId: current })}
              >
                Forçar vitória do turno
              </button>
            </div>
          </>
        ) : null}

        {tab === 'MAPA' ? (
          <>
            <h4>Território</h4>
            <select
              className="dev__select"
              value={target}
              onChange={(event) => setTarget(event.target.value as TerritoryId)}
            >
              <option value="">Selecione…</option>
              {Object.values(state.territories).map((territory) => (
                <option key={territory.id as string} value={territory.id as string}>
                  {territory.name} ({territory.garrison.length})
                </option>
              ))}
            </select>
            {target ? (
              <>
                <div className="dev__row">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => dispatch({ type: 'ADD_SOLDIERS', territoryId: target, amount: 1, ownerId: undefined })}
                  >
                    +1 tropa
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => dispatch({ type: 'REMOVE_SOLDIERS', territoryId: target, amount: 1 })}
                  >
                    −1 tropa
                  </button>
                </div>
                <h4>Trocar controlador</h4>
                <div className="dev__row">
                  {players.map((player) => (
                    <button
                      key={player.id as string}
                      type="button"
                      className="chip"
                      onClick={() =>
                        dispatch({ type: 'SET_CONTROLLER', territoryId: target, playerId: player.id })
                      }
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            <p className="dev__note">
              Territórios: {Object.keys(state.territories).length} · Conexões desativadas:{' '}
              {state.disabledLinks.length}
            </p>
          </>
        ) : null}

        {tab === 'CARTAS' ? (
          <>
            <h4>Dar carta ao jogador do turno</h4>
            <div className="dev__row dev__row--wrap">
              {listCardDefinitions().map((definition) => (
                <button
                  key={definition.id as string}
                  type="button"
                  className="chip"
                  onClick={() =>
                    dispatch({
                      type: 'GRANT_CARD',
                      playerId: current,
                      definitionId: definition.id as CardDefinitionId,
                    })
                  }
                >
                  {definition.name}
                </button>
              ))}
            </div>
            <p className="dev__note">
              Baralho: {state.deck.length} · Descarte: {state.discard.length}
            </p>
          </>
        ) : null}

        {tab === 'MISSOES' ? (
          <>
            <h4>Objetivos por jogador</h4>
            <ul className="dev__list">
              {players.map((player) => {
                const entry = state.missions[player.id as string];
                return (
                  <li key={player.id as string}>
                    <b>{player.name}</b>: {entry?.replacedBy ?? entry?.missionId ?? '—'}{' '}
                    {entry?.completed ? '✔' : ''}
                    <small> · {territoriesOf(state, player.id).length} territórios</small>
                  </li>
                );
              })}
            </ul>
            <h4>Trocar objetivo do jogador do turno</h4>
            <select
              className="dev__select"
              onChange={(event) =>
                dispatch({
                  type: 'DEV_SET_MISSION',
                  playerId: current,
                  missionId: event.target.value,
                })
              }
              defaultValue=""
            >
              <option value="" disabled>
                Selecione…
              </option>
              {listMissions().map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.name}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {tab === 'COLAPSO' ? (
          <>
            <p className="dev__note">
              Chance atual: {(currentChance(state) * 100).toFixed(0)}% · pressão{' '}
              {state.collapse.pressure} · cooldown {state.collapse.cooldown} · disparados{' '}
              {state.collapse.triggered}
            </p>
            <h4>Forçar evento</h4>
            <select
              className="dev__select"
              onChange={(event) =>
                dispatch({ type: 'DEV_FORCE_COLLAPSE', eventId: event.target.value })
              }
              defaultValue=""
            >
              <option value="" disabled>
                Selecione…
              </option>
              {listCollapseEvents().map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event.categories.join('/')})
                </option>
              ))}
            </select>
            <h4>Histórico</h4>
            <ul className="dev__list">
              {state.collapse.history.map((entry, index) => (
                <li key={index}>
                  R{entry.round}: {entry.eventId} — {entry.summary}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === 'ARTE' ? (
          <>
            <h4>Assets que faltam ({allAssetsNeeded().length})</h4>
            <p className="dev__note">
              Tudo abaixo é PLACEHOLDER desenhado por código. Nenhum item é arte final.
            </p>
            <ul className="dev__list">
              {allAssetsNeeded().map((asset) => (
                <li key={asset.file}>
                  <strong>ASSET_NEEDED:</strong> {asset.file}
                  <br />
                  {asset.purpose} — hoje: {asset.placeholder}
                </li>
              ))}
            </ul>
            <h4>Facções registradas</h4>
            <ul className="dev__list">
              {listFactions().map((faction) => (
                <li key={faction.id as string}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: faction.color,
                      marginRight: 6,
                    }}
                  />
                  {faction.name} · {faction.color} · {faction.status}
                </li>
              ))}
            </ul>
            <p className="dev__note">
              CONFLITO REGISTRADO: as referências visuais mostram TECNÓLOGOS no assento que o
              texto oficial dá aos VAMPIROS. Os dois estão implementados; só os Vampiros entram
              no roster oficial de seleção.
            </p>
          </>
        ) : null}

        {tab === 'ESTADO' ? (
          <>
            <h4>Invariantes</h4>
            {problems.length === 0 ? (
              <p className="dev__ok">Estado íntegro: nenhum problema encontrado.</p>
            ) : (
              <ul className="dev__list dev__list--bad">
                {problems.map((problem, index) => (
                  <li key={index}>{problem}</li>
                ))}
              </ul>
            )}
            <h4>Resumo</h4>
            <ul className="dev__list">
              <li>Soldados vivos: {Object.values(state.soldiers).filter((s) => s.alive).length}</li>
              <li>Cartas em jogo: {Object.keys(state.cards).length}</li>
              <li>Efeitos na fila: {state.effectQueue.length}</li>
              <li>Modificadores ativos: {state.territoryModifiers.length}</li>
              <li>Status: {state.status}</li>
            </ul>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => dispatch({ type: 'DEV_CLEAR_EFFECTS' })}
            >
              Limpar fila de efeitos
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export type { PlayerId };
