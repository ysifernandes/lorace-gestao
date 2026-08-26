import { useCallback, useMemo, useState } from 'react';
import type { CardInstance, CardMode } from '../game/types/card.types';
import type { Territory } from '../game/types/territory.types';
import type { SoldierId, TerritoryId } from '../game/types/ids';
import { useGame } from '../hooks/useGame';
import { useMapInteraction } from '../hooks/useMapInteraction';
import { Board } from '../components/board/Board';
import { TopHud } from '../components/hud/TopHud';
import { PlayersPanel } from '../components/hud/PlayersPanel';
import { TerritorySheet } from '../components/hud/TerritorySheet';
import { BattlePanel } from '../components/hud/BattlePanel';
import { DeckZone } from '../components/hud/DeckZone';
import { GameCard } from '../components/cards/GameCard';
import { CardPreview } from '../components/cards/CardPreview';
import { SequestroModal } from '../components/panels/SequestroModal';
import { DistributionModal } from '../components/panels/DistributionModal';
import { OccupationModal } from '../components/panels/OccupationModal';
import { TroopTransferModal } from '../components/panels/TroopTransferModal';
import { OperacaoAereaModal } from '../components/panels/OperacaoAereaModal';
import { DefensePrompt } from '../components/panels/DefensePrompt';
import { LogPanel } from '../components/panels/LogPanel';
import { AnimationStage } from '../components/panels/AnimationStage';
import { AbilityFeed } from '../components/panels/AbilityFeed';
import { FactionPanel } from '../components/faction/FactionPanel';
import { DevPanel } from '../dev/DevPanel';
import { maxMovableFrom, neighborsOf, validAttackTargets, validMoveTargets } from '../game/map/adjacency';
import { capturableSoldiers, handOf } from '../game/engine/selectors';
import { OPERACAO_AEREA_ID } from '../game/abilities/humanos/operacaoAerea';

export function GamePage() {
  const { state, dispatch, error, notice, saveAvailable } = useGame();
  const { selected, setSelected, mode, setMode, reset } = useMapInteraction();
  const [openCard, setOpenCard] = useState<CardInstance | null>(null);
  const [sequestroCard, setSequestroCard] = useState<CardInstance | null>(null);
  const [transfer, setTransfer] = useState<{ from: Territory; to: Territory } | null>(null);
  const [battle, setBattle] = useState<{ from: Territory; to: Territory; amount: number } | null>(null);
  const [airliftOpen, setAirliftOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);

  const currentPlayerId = state.turn.currentPlayerId;
  const selectedTerritory = selected ? state.territories[selected as string] : null;
  const blocked = !!state.pendingOccupation || !!state.pendingDistribution;
  const hand = handOf(state, currentPlayerId);

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
  const neighborIds = useMemo<TerritoryId[]>(
    () => (selected && mode.kind === 'IDLE' ? neighborsOf(state, selected).map((t) => t.id) : []),
    [selected, mode, state],
  );

  const handleSelect = useCallback(
    (territory: Territory) => {
      if (mode.kind === 'MOVE' && territory.id !== mode.from) {
        if (validMoveTargets(state, mode.from).some((t) => t.id === territory.id)) {
          setTransfer({ from: state.territories[mode.from as string], to: territory });
          return;
        }
      }
      if (mode.kind === 'ATTACK' && territory.id !== mode.from) {
        if (validAttackTargets(state, mode.from).some((t) => t.id === territory.id)) {
          setBattle({ from: state.territories[mode.from as string], to: territory, amount: 1 });
          return;
        }
      }
      setMode({ kind: 'IDLE' });
      setSelected(territory.id);
      setSideOpen(true);
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
      return 'Território hostil: selecione um setor sob seu comando para agir.';
    }
    if (state.turn.phase !== 'MOVIMENTACAO' && state.turn.phase !== 'COMBATE') {
      return 'Mover exige a fase de Movimentação; atacar exige a fase de Combate.';
    }
    if (maxMovableFrom(state, territory.id) === 0) {
      return 'Sem tropas disponíveis: ao menos 1 soldado permanece no setor.';
    }
    return undefined;
  }

  const modeMessage =
    mode.kind === 'MOVE'
      ? 'Selecione um setor aliado com fronteira para deslocar tropas.'
      : mode.kind === 'ATTACK'
        ? 'Selecione um setor hostil com fronteira para atacar.'
        : mode.kind === 'SEQUESTRO'
          ? 'Sequestro: escolha um setor hostil no mapa.'
          : null;

  return (
    <div className="game">
      <TopHud
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

      {modeMessage && (
        <div className="mode-banner" role="status">
          <span className="mode-banner__pulse" aria-hidden="true" />
          {modeMessage}
          <button type="button" className="btn btn--small" onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      <main className="game__body">
        <section className="game__board-area">
          <Board
            state={state}
            selectedId={selected}
            moveTargets={moveTargets}
            attackTargets={attackTargets}
            captureTargets={captureTargets}
            neighborIds={neighborIds}
            onSelect={handleSelect}
          />
          <PlayersPanel state={state} />
        </section>

        <aside className={`game__side${sideOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="game__side-close btn btn--icon"
            onClick={() => setSideOpen(false)}
            aria-label="Fechar painel"
          >
            ✕
          </button>

          <DefensePrompt
            state={state}
            onUseDefensiveCard={(card) =>
              dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, mode: 'ALTERNATE' })
            }
            onResolve={() => dispatch({ type: 'RESOLVE_ATTACK' })}
            onDevWin={() => dispatch({ type: 'DEV_WIN_ATTACK' })}
          />

          {selectedTerritory ? (
            <TerritorySheet
              state={state}
              territory={selectedTerritory}
              canMove={canMove}
              canAttack={canAttack}
              hint={hintFor(selectedTerritory)}
              onMove={() => {
                setMode({ kind: 'MOVE', from: selectedTerritory.id });
                setSideOpen(false);
              }}
              onAttack={() => {
                setMode({ kind: 'ATTACK', from: selectedTerritory.id });
                setSideOpen(false);
              }}
              onCancel={() => {
                reset();
                setSideOpen(false);
              }}
            />
          ) : (
            <section className="panel panel--empty">
              <p className="panel__empty">Toque em um setor do mapa para abrir a ficha tática.</p>
            </section>
          )}

          <FactionPanel
            state={state}
            playerId={currentPlayerId}
            onActivate={(abilityId) => {
              if (abilityId === OPERACAO_AEREA_ID) {
                setAirliftOpen(true);
                return;
              }
              dispatch({ type: 'ACTIVATE_ABILITY', abilityId });
            }}
          />

          <LogPanel state={state} />

          <p className="save-note">
            {saveAvailable
              ? 'Partida salva automaticamente neste dispositivo.'
              : 'Armazenamento local indisponível: a partida existe apenas nesta sessão.'}
          </p>
        </aside>
      </main>

      <footer className="hand-bar">
        <DeckZone />
        <ul className="hand">
          {hand.map((card, index) => (
            <GameCard
              key={card.instanceId as string}
              state={state}
              card={card}
              index={index}
              onOpen={setOpenCard}
            />
          ))}
          {hand.length === 0 && <li className="hand__empty">Nenhuma carta na mão.</li>}
        </ul>
        <button
          type="button"
          className="hand-bar__toggle btn btn--ghost"
          onClick={() => setSideOpen((open) => !open)}
        >
          Painel
        </button>
      </footer>

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
        <CardPreview
          state={state}
          card={openCard}
          onUse={(cardMode) => chooseCardMode(openCard, cardMode)}
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
          kind="MOVE"
          from={state.territories[transfer.from.id as string]}
          to={state.territories[transfer.to.id as string]}
          max={maxMovableFrom(state, transfer.from.id)}
          onConfirm={(amount) => {
            const ok = dispatch({
              type: 'MOVE_SOLDIERS',
              from: transfer.from.id,
              to: transfer.to.id,
              amount,
            });
            if (ok) {
              setTransfer(null);
              reset();
            }
          }}
          onClose={() => setTransfer(null)}
        />
      )}

      {battle && (
        <BattlePanel
          state={state}
          from={state.territories[battle.from.id as string]}
          to={state.territories[battle.to.id as string]}
          amount={battle.amount}
          max={maxMovableFrom(state, battle.from.id)}
          onAmountChange={(amount) => setBattle({ ...battle, amount })}
          onAttack={() => {
            const ok = dispatch({
              type: 'DECLARE_ATTACK',
              from: battle.from.id,
              to: battle.to.id,
              amount: battle.amount,
            });
            if (ok) {
              setBattle(null);
              reset();
              setSideOpen(true);
            }
          }}
          onRetreat={() => setBattle(null)}
        />
      )}

      {airliftOpen && (
        <OperacaoAereaModal
          state={state}
          onClose={() => setAirliftOpen(false)}
          onConfirm={(params) => {
            const ok = dispatch({ type: 'ACTIVATE_ABILITY', abilityId: OPERACAO_AEREA_ID, params });
            if (ok) setAirliftOpen(false);
          }}
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

      <AbilityFeed state={state} />

      <AnimationStage
        state={state}
        onAcknowledge={(eventId) => dispatch({ type: 'ACK_ANIMATION', eventId })}
      />

      <DevPanel state={state} dispatch={dispatch} />
    </div>
  );
}
