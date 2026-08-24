import { useCallback, useMemo, useState } from 'react';
import type { CardInstance, CardMode } from '../game/types/card.types';
import type { Territory } from '../game/types/territory.types';
import type { SoldierId, TerritoryId } from '../game/types/ids';
import { useGame } from '../hooks/useGame';
import { useMapInteraction } from '../hooks/useMapInteraction';
import { MapView } from '../components/map/MapView';
import { TurnBar } from '../components/panels/TurnBar';
import { TerritoryPanel } from '../components/panels/TerritoryPanel';
import { HandPanel } from '../components/panels/HandPanel';
import { CardModal } from '../components/panels/CardModal';
import { SequestroModal } from '../components/panels/SequestroModal';
import { DistributionModal } from '../components/panels/DistributionModal';
import { OccupationModal } from '../components/panels/OccupationModal';
import { TroopTransferModal } from '../components/panels/TroopTransferModal';
import { DefensePrompt } from '../components/panels/DefensePrompt';
import { LogPanel } from '../components/panels/LogPanel';
import { AnimationStage } from '../components/panels/AnimationStage';
import { DevPanel } from '../dev/DevPanel';
import { maxMovableFrom, validAttackTargets, validMoveTargets } from '../game/map/adjacency';
import { capturableSoldiers } from '../game/engine/selectors';

export function GamePage() {
  const { state, dispatch, error, notice, saveAvailable } = useGame();
  const { selected, setSelected, mode, setMode, reset } = useMapInteraction();
  const [openCard, setOpenCard] = useState<CardInstance | null>(null);
  const [sequestroCard, setSequestroCard] = useState<CardInstance | null>(null);
  const [transfer, setTransfer] = useState<{
    kind: 'MOVE' | 'ATTACK';
    from: Territory;
    to: Territory;
  } | null>(null);

  const currentPlayerId = state.turn.currentPlayerId;
  const selectedTerritory = selected ? state.territories[selected as string] : null;
  const blocked = !!state.pendingOccupation || !!state.pendingDistribution;

  const moveTargets = useMemo<TerritoryId[]>(
    () => (mode.kind === 'MOVE' ? validMoveTargets(state, mode.from).map((t) => t.id) : []),
    [mode, state],
  );
  const attackTargets = useMemo<TerritoryId[]>(
    () => (mode.kind === 'ATTACK' ? validAttackTargets(state, mode.from).map((t) => t.id) : []),
    [mode, state],
  );
  const captureTargets = useMemo<TerritoryId[]>(
    () =>
      mode.kind === 'SEQUESTRO'
        ? capturableSoldiers(state, currentPlayerId).map((g) => g.territory.id)
        : [],
    [mode, state, currentPlayerId],
  );

  const handleSelect = useCallback(
    (territory: Territory) => {
      if (mode.kind === 'MOVE' && territory.id !== mode.from) {
        if (validMoveTargets(state, mode.from).some((t) => t.id === territory.id)) {
          setTransfer({
            kind: 'MOVE',
            from: state.territories[mode.from as string],
            to: territory,
          });
          return;
        }
      }
      if (mode.kind === 'ATTACK' && territory.id !== mode.from) {
        if (validAttackTargets(state, mode.from).some((t) => t.id === territory.id)) {
          setTransfer({
            kind: 'ATTACK',
            from: state.territories[mode.from as string],
            to: territory,
          });
          return;
        }
      }
      setMode({ kind: 'IDLE' });
      setSelected(territory.id);
    },
    [mode, state, setMode, setSelected],
  );

  function chooseCardMode(card: CardInstance, cardMode: CardMode) {
    setOpenCard(null);
    if (cardMode === 'PRIMARY') {
      setSequestroCard(card);
      setMode({ kind: 'SEQUESTRO' });
      return;
    }
    dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, mode: 'ALTERNATE' });
  }

  function confirmSequestro(soldierIds: SoldierId[]) {
    if (!sequestroCard) return;
    const ok = dispatch({
      type: 'PLAY_CARD',
      cardInstanceId: sequestroCard.instanceId,
      mode: 'PRIMARY',
      targetSoldierIds: soldierIds,
    });
    if (ok) {
      setSequestroCard(null);
      setMode({ kind: 'IDLE' });
    }
  }

  function confirmTransfer(amount: number) {
    if (!transfer) return;
    const ok = dispatch(
      transfer.kind === 'MOVE'
        ? { type: 'MOVE_SOLDIERS', from: transfer.from.id, to: transfer.to.id, amount }
        : { type: 'DECLARE_ATTACK', from: transfer.from.id, to: transfer.to.id, amount },
    );
    if (ok) {
      setTransfer(null);
      reset();
    }
  }

  const canMove =
    !!selectedTerritory &&
    selectedTerritory.controllerId === currentPlayerId &&
    state.turn.phase === 'MOVIMENTACAO' &&
    maxMovableFrom(state, selectedTerritory.id) > 0 &&
    validMoveTargets(state, selectedTerritory.id).length > 0;

  const canAttack =
    !!selectedTerritory &&
    selectedTerritory.controllerId === currentPlayerId &&
    state.turn.phase === 'COMBATE' &&
    !state.pendingAttack &&
    maxMovableFrom(state, selectedTerritory.id) > 0 &&
    validAttackTargets(state, selectedTerritory.id).length > 0;

  function hintFor(territory: Territory): string | undefined {
    if (territory.controllerId !== currentPlayerId) {
      return 'Território inimigo: selecione um território seu para agir.';
    }
    if (state.turn.phase !== 'MOVIMENTACAO' && state.turn.phase !== 'COMBATE') {
      return 'Mover exige a fase de Movimentação; atacar exige a fase de Combate.';
    }
    if (maxMovableFrom(state, territory.id) === 0) {
      return 'Sem tropas disponíveis: ao menos 1 soldado precisa ficar no território.';
    }
    return undefined;
  }

  return (
    <div className="game">
      <TurnBar
        state={state}
        blocked={blocked}
        onAdvancePhase={() => {
          reset();
          dispatch({ type: 'ADVANCE_PHASE' });
        }}
        onEndTurn={() => {
          reset();
          dispatch({ type: 'END_TURN' });
        }}
      />

      {mode.kind !== 'IDLE' && (
        <div className="mode-banner" role="status">
          {mode.kind === 'MOVE' && 'Selecione um território aliado adjacente para mover.'}
          {mode.kind === 'ATTACK' && 'Selecione um território inimigo adjacente para atacar.'}
          {mode.kind === 'SEQUESTRO' && 'Sequestro: escolha um território inimigo no mapa.'}
          <button type="button" className="btn btn--small" onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      <main className="game__body">
        <MapView
          state={state}
          selectedId={selected}
          moveTargets={moveTargets}
          attackTargets={attackTargets}
          captureTargets={captureTargets}
          onSelect={handleSelect}
        />

        <aside className="game__side">
          <DefensePrompt
            state={state}
            onUseDefensiveCard={(card) =>
              dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, mode: 'ALTERNATE' })
            }
            onResolve={() => dispatch({ type: 'RESOLVE_ATTACK' })}
            onDevWin={() => dispatch({ type: 'DEV_WIN_ATTACK' })}
          />

          {selectedTerritory ? (
            <TerritoryPanel
              state={state}
              territory={selectedTerritory}
              canMove={canMove}
              canAttack={canAttack}
              hint={hintFor(selectedTerritory)}
              onMove={() => setMode({ kind: 'MOVE', from: selectedTerritory.id })}
              onAttack={() => setMode({ kind: 'ATTACK', from: selectedTerritory.id })}
              onCancel={reset}
            />
          ) : (
            <section className="panel">
              <p className="panel__empty">
                Toque em um território do mapa para ver detalhes e ações.
              </p>
            </section>
          )}

          <HandPanel
            state={state}
            playerId={currentPlayerId}
            title="Minha mão"
            onOpenCard={setOpenCard}
          />

          <LogPanel state={state} />

          <p className="save-note">
            {saveAvailable
              ? 'Partida salva automaticamente neste dispositivo.'
              : 'Armazenamento local indisponível: a partida existe apenas nesta sessão.'}
          </p>
        </aside>
      </main>

      {error && (
        <div className="toast toast--error" role="alert">
          {error}
        </div>
      )}
      {!error && notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      {openCard && (
        <CardModal
          state={state}
          card={openCard}
          onChoose={(cardMode) => chooseCardMode(openCard, cardMode)}
          onClose={() => setOpenCard(null)}
        />
      )}

      {sequestroCard && (
        <SequestroModal
          state={state}
          initialTerritoryId={selected}
          onConfirm={confirmSequestro}
          onClose={() => {
            setSequestroCard(null);
            setMode({ kind: 'IDLE' });
          }}
        />
      )}

      {transfer && (
        <TroopTransferModal
          kind={transfer.kind}
          from={state.territories[transfer.from.id as string]}
          to={state.territories[transfer.to.id as string]}
          max={maxMovableFrom(state, transfer.from.id)}
          onConfirm={confirmTransfer}
          onClose={() => setTransfer(null)}
        />
      )}

      {state.pendingOccupation && (
        <OccupationModal
          state={state}
          onConfirm={(amount) => dispatch({ type: 'OCCUPY_TERRITORY', amount })}
        />
      )}

      {state.pendingDistribution && (
        <DistributionModal
          state={state}
          onConfirm={(assignments) => dispatch({ type: 'DISTRIBUTE_RESERVES', assignments })}
        />
      )}

      <AnimationStage
        state={state}
        onAcknowledge={(eventId) => dispatch({ type: 'ACK_ANIMATION', eventId })}
      />

      <DevPanel state={state} dispatch={dispatch} />
    </div>
  );
}
