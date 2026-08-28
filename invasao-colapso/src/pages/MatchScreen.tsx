import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../hooks/useGame';
import type { CardInstance, CardMode } from '../game/types/card.types';
import type { SoldierId, TerritoryId } from '../game/types/ids';
import { GameBoard } from '../components/board/GameBoard';
import type { BoardMode } from '../components/board/GameBoard';
import { TopBar } from '../components/hud/TopBar';
import { PhaseBar } from '../components/hud/PhaseBar';
import { BattleBoard } from '../components/hud/BattleBoard';
import { TerritoryInspector } from '../components/hud/TerritoryInspector';
import type { InspectorAction } from '../components/hud/TerritoryInspector';
import { MissionPanel } from '../components/hud/MissionPanel';
import { CollapseOverlay } from '../components/overlays/CollapseOverlay';
import { VictoryOverlay } from '../components/overlays/VictoryOverlay';
import { OccupationModal } from '../components/panels/OccupationModal';
import { DistributionModal } from '../components/panels/DistributionModal';
import { SequestroModal } from '../components/panels/SequestroModal';
import { GameCard } from '../components/cards/GameCard';
import { CardPreview } from '../components/cards/CardPreview';
import { LogPanel } from '../components/panels/LogPanel';
import { AnimationStage } from '../components/panels/AnimationStage';
import { AbilityFeed } from '../components/panels/AbilityFeed';
import { DevPanel } from '../dev/DevPanel';
import { TurnBanner } from '../components/hud/TurnBanner';
import { TutorialCoach } from '../components/tutorial/TutorialCoach';
import { DiceArena } from '../components/battle/DiceArena';
import { phaseGuide } from '../game/turns/phaseGuide';
import { getFaction } from '../game/factions/faction.registry';
import {
  activeCollapseSummary,
  attackTargetsFrom,
  handOf,
  moveTargetsFrom,
  reinforcementDetail,
  specialTargetsFrom,
  transportStatus,
} from '../game/engine/selectors';
import { getCardDefinition } from '../game/cards/card.registry';
import { SEQUESTRO_CARD_ID } from '../game/cards/sequestro.card';
import { BALANCE } from '../game/config/balance';
import { canDrawNow } from '../game/deck/deck';

type Pending =
  | { kind: 'NONE' }
  | { kind: 'ATTACK_FROM'; from: TerritoryId }
  | { kind: 'SPECIAL_FROM'; from: TerritoryId }
  | { kind: 'MOVE_FROM'; from: TerritoryId }
  | { kind: 'CARD_TARGET'; card: CardInstance; mode: CardMode };

export function MatchScreen() {
  const { state, dispatch, goHome, goSetup, error, notice, mode, viewerId, canAct, lastDice, leaveRoom } =
    useGame();
  const [selected, setSelected] = useState<TerritoryId | null>(null);
  const [pending, setPending] = useState<Pending>({ kind: 'NONE' });
  const [preview, setPreview] = useState<CardInstance | null>(null);
  const [showMission, setShowMission] = useState(false);
  const [sequestro, setSequestro] = useState<CardInstance | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  /** Rodada que está sendo encenada. Trava ações enquanto os dados rolam. */
  const [rolling, setRolling] = useState<number | null>(null);
  const lastRoundRef = useRef(0);

  const player = state.players[state.turn.currentPlayerId as string];
  const phase = state.turn.phase;
  const finished = state.status === 'FINISHED';
  const hand = handOf(state, player.id);
  const transport = transportStatus(state, player.id);
  const reinforcement = reinforcementDetail(state, player.id);
  const drawable = canDrawNow(state, player.id);

  const battleRounds = state.pendingAttack?.rounds ?? [];
  const lastRound = battleRounds[battleRounds.length - 1] ?? null;

  // Toda rodada nova do motor vira uma apresentação. A animação nunca cria
  // uma rodada: ela só encena a que já existe no estado.
  useEffect(() => {
    if (battleRounds.length > lastRoundRef.current) {
      lastRoundRef.current = battleRounds.length;
      setRolling(battleRounds.length);
    }
    if (battleRounds.length === 0) lastRoundRef.current = 0;
  }, [battleRounds.length]);

  const origin = pending.kind !== 'NONE' && pending.kind !== 'CARD_TARGET' ? pending.from : null;

  const highlighted = useMemo<TerritoryId[]>(() => {
    if (pending.kind === 'ATTACK_FROM') {
      return attackTargetsFrom(state, pending.from).map((t) => t.id);
    }
    if (pending.kind === 'SPECIAL_FROM') {
      return specialTargetsFrom(state, pending.from).map((t) => t.id);
    }
    if (pending.kind === 'MOVE_FROM') {
      return moveTargetsFrom(state, pending.from).map((t) => t.id);
    }
    return [];
  }, [pending, state]);

  const boardMode: BoardMode =
    pending.kind === 'ATTACK_FROM'
      ? 'ATTACK'
      : pending.kind === 'SPECIAL_FROM'
        ? 'SPECIAL'
        : pending.kind === 'MOVE_FROM'
          ? 'MOVE'
          : pending.kind === 'CARD_TARGET'
            ? 'CARD_TARGET'
            : phase === 'REFORCO'
              ? 'REINFORCE'
              : 'IDLE';

  function handleSelect(id: TerritoryId) {
    setSelected(id);
    if (pending.kind === 'CARD_TARGET') {
      playCardWithTarget(pending.card, pending.mode, id);
      return;
    }
  }

  function handleInspector(action: InspectorAction) {
    switch (action.kind) {
      case 'REINFORCE':
        dispatch({ type: 'ADD_SOLDIERS', territoryId: action.territoryId, amount: action.amount });
        break;
      case 'ATTACK_FROM':
        setPending({ kind: 'ATTACK_FROM', from: action.territoryId });
        break;
      case 'SPECIAL_FROM':
        setPending({ kind: 'SPECIAL_FROM', from: action.territoryId });
        break;
      case 'MOVE_FROM':
        setPending({ kind: 'MOVE_FROM', from: action.territoryId });
        break;
      case 'ATTACK_TO':
        if (pending.kind === 'ATTACK_FROM') {
          if (dispatch({ type: 'DECLARE_ATTACK', from: pending.from, to: action.territoryId })) {
            setPending({ kind: 'NONE' });
          }
        }
        break;
      case 'SPECIAL_TO':
        if (pending.kind === 'SPECIAL_FROM') {
          if (
            dispatch({
              type: 'DECLARE_SPECIAL_ATTACK',
              from: pending.from,
              to: action.territoryId,
              amount: action.amount,
            })
          ) {
            setPending({ kind: 'NONE' });
          }
        }
        break;
      case 'MOVE_TO':
        if (pending.kind === 'MOVE_FROM') {
          if (
            dispatch({
              type: 'MOVE_SOLDIERS',
              from: pending.from,
              to: action.territoryId,
              amount: action.amount,
            })
          ) {
            setPending({ kind: 'NONE' });
          }
        }
        break;
      case 'CLEAR':
        setPending({ kind: 'NONE' });
        break;
    }
  }

  function playCardWithTarget(card: CardInstance, mode: CardMode, target: TerritoryId) {
    const definition = getCardDefinition(card.definitionId);
    const spec = (mode === 'PRIMARY' ? definition.primaryEffect : definition.alternateEffect)?.action;
    const params =
      spec?.type === 'EVACUATE'
        ? { fromTerritoryId: pendingEvacuationOrigin ?? target, targetTerritoryId: target }
        : { targetTerritoryId: target };
    if (dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, mode, params })) {
      setPending({ kind: 'NONE' });
      setPreview(null);
      setPendingEvacuationOrigin(null);
    }
  }

  const [pendingEvacuationOrigin, setPendingEvacuationOrigin] = useState<TerritoryId | null>(null);

  function useCard(card: CardInstance, mode: CardMode) {
    const definition = getCardDefinition(card.definitionId);
    if (definition.id === SEQUESTRO_CARD_ID && mode === 'PRIMARY') {
      setPreview(null);
      setSequestro(card);
      return;
    }
    const spec = (mode === 'PRIMARY' ? definition.primaryEffect : definition.alternateEffect)?.action;
    const needsTerritory =
      spec &&
      ['SABOTAGE', 'SHIELD', 'BLOCK_TERRITORY', 'DEFECTION', 'EVACUATE'].includes(spec.type);
    if (needsTerritory) {
      if (spec?.type === 'EVACUATE') setPendingEvacuationOrigin(selected);
      setPreview(null);
      setPending({ kind: 'CARD_TARGET', card, mode });
      return;
    }
    const needsPlayer = spec?.type === 'REVEAL_HAND';
    const params = needsPlayer
      ? {
          targetPlayerId: state.turn.order.find(
            (id) => id !== player.id && state.players[id as string]?.status === 'ACTIVE',
          ),
        }
      : {};
    if (dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, mode, params })) {
      setPreview(null);
    }
  }

  const inspectorTerritory = selected ? state.territories[selected as string] : null;
  const canReinforce =
    phase === 'REFORCO' &&
    state.turn.pendingReinforcements > 0 &&
    inspectorTerritory?.controllerId === player.id;
  const canAttackFrom =
    phase === 'ATAQUE_COMUM' &&
    !state.turn.commonAttackUsed &&
    !state.pendingAttack &&
    inspectorTerritory?.controllerId === player.id &&
    (inspectorTerritory?.garrison.length ?? 0) > 1 &&
    attackTargetsFrom(state, inspectorTerritory!.id).length > 0;
  const canSpecialFrom =
    phase === 'ATAQUE_ESPECIAL' &&
    transport.available &&
    !state.pendingAttack &&
    inspectorTerritory?.controllerId === player.id &&
    (inspectorTerritory?.garrison.length ?? 0) > 1 &&
    specialTargetsFrom(state, inspectorTerritory!.id).length > 0;
  const canMoveFrom =
    phase === 'MOVIMENTACAO' &&
    state.turn.movesUsed < state.turn.movesAllowed &&
    inspectorTerritory?.controllerId === player.id &&
    (inspectorTerritory?.garrison.length ?? 0) > 1;

  const guide = phaseGuide(state, player.id);
  const viewer = state.players[viewerId as string] ?? player;
  const viewerFaction = getFaction(viewer.factionId);
  const attackerFaction = state.pendingAttack
    ? getFaction(state.players[state.pendingAttack.attackerPlayerId as string].factionId)
    : null;
  const defenderFaction = state.pendingAttack
    ? getFaction(state.players[state.pendingAttack.defenderPlayerId as string]?.factionId ?? viewer.factionId)
    : null;
  /** Durante a apresentação dos dados, nenhuma ação conflitante é aceita. */
  const locked = rolling !== null;

  /** A AÇÃO PRINCIPAL do momento — uma só, sempre óbvia. */
  function runPrimary() {
    if (locked) return;
    if (state.pendingAttack?.status === 'DECLARED') {
      dispatch({ type: 'ROLL_BATTLE_ROUND' });
      return;
    }
    if (phase === 'REFORCO' && state.turn.pendingReinforcements > 0) {
      dispatch({ type: 'AUTO_REINFORCE' });
      return;
    }
    if (phase === 'CARTAS' && drawable.ok) {
      dispatch({ type: 'DRAW_CARD' });
      return;
    }
    dispatch({ type: 'ADVANCE_PHASE' });
  }

  const isTarget = selected ? highlighted.includes(selected) : false;
  const originTroops = origin ? (state.territories[origin as string]?.garrison.length ?? 0) : 0;

  return (
    <div className="match">
      <TopBar
        state={state}
        onOpenMission={() => setShowMission(true)}
        onExit={mode === 'ONLINE' ? leaveRoom : goHome}
      />

      <TurnBanner
        playerName={player.name}
        faction={viewerFaction}
        guide={guide}
        yours={canAct}
        onPrimary={runPrimary}
        primaryDisabled={locked}
        onHelp={() => setShowHelp((open) => !open)}
      />

      {showHelp ? (
        <div className="phasehelp" role="note">
          <strong>{guide.title}</strong>
          <p>{guide.instruction}</p>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => setShowHelp(false)}>
            Fechar
          </button>
        </div>
      ) : null}

      <div className="match__body">
        <main className="match__map">
          <GameBoard
            state={state}
            viewerId={player.id}
            selectedId={selected}
            highlighted={highlighted}
            originId={origin}
            mode={boardMode}
            onSelect={handleSelect}
          />
        </main>

        {lastRound && rolling !== null && attackerFaction && defenderFaction ? (
          <div className="arena-stage" role="dialog" aria-label="Rolagem de dados">
            <DiceArena
              round={lastRound}
              seed={lastDice?.seed ?? lastRound.index}
              attackerColor={attackerFaction.color}
              defenderColor={defenderFaction.color}
              onFinished={() => setRolling(null)}
            />
          </div>
        ) : null}

        <aside className="match__side">
          {state.pendingAttack ? (
            <BattleBoard
              state={state}
              onRoll={() => !locked && dispatch({ type: 'ROLL_BATTLE_ROUND' })}
              onRetreat={() => !locked && dispatch({ type: 'CANCEL_ATTACK' })}
            />
          ) : null}

          {phase === 'REFORCO' ? (
            <section className="panel panel--reinforce">
              <h3>Reforço</h3>
              <p className="panel__big">{state.turn.pendingReinforcements}</p>
              <ul className="panel__breakdown">
                <li>
                  Base (territórios ÷ {BALANCE.reinforcements.territoriesPerExtraTroop}, mínimo{' '}
                  {BALANCE.reinforcements.minimum}): <b>{reinforcement.base}</b>
                </li>
                {reinforcement.regionBonus > 0 ? (
                  <li>
                    Regiões completas ({reinforcement.regions.join(', ')}):{' '}
                    <b>+{reinforcement.regionBonus}</b>
                  </li>
                ) : null}
                {reinforcement.poiBonus > 0 ? (
                  <li>
                    Pontos de Interesse: <b>+{reinforcement.poiBonus}</b>
                  </li>
                ) : null}
                {reinforcement.collapseBonus > 0 ? (
                  <li>
                    Evento do Colapso: <b>+{reinforcement.collapseBonus}</b>
                  </li>
                ) : null}
              </ul>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => dispatch({ type: 'AUTO_REINFORCE' })}
                disabled={state.turn.pendingReinforcements === 0}
              >
                Distribuir automaticamente
              </button>
            </section>
          ) : null}

          {phase === 'CARTAS' ? (
            <section className="panel">
              <h3>Cartas</h3>
              <p className="panel__line">
                Baralho: <b>{state.deck.length}</b> · Descarte: <b>{state.discard.length}</b>
              </p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => dispatch({ type: 'DRAW_CARD' })}
                disabled={!drawable.ok}
                title={drawable.reason}
              >
                Comprar carta
              </button>
              <p className="panel__hint">{drawable.reason}</p>
            </section>
          ) : null}

          {inspectorTerritory ? (
            <TerritoryInspector
              state={state}
              territoryId={inspectorTerritory.id}
              originId={origin}
              canReinforce={Boolean(canReinforce)}
              canAttackFrom={Boolean(canAttackFrom)}
              canSpecialFrom={Boolean(canSpecialFrom)}
              canMoveFrom={Boolean(canMoveFrom)}
              isAttackTarget={pending.kind === 'ATTACK_FROM' && isTarget}
              isMoveTarget={pending.kind === 'MOVE_FROM' && isTarget}
              isSpecialTarget={pending.kind === 'SPECIAL_FROM' && isTarget}
              maxMove={Math.max(1, originTroops - 1)}
              maxSpecial={Math.max(1, Math.min(BALANCE.transport.maxSoldiers, originTroops - 1))}
              onAction={handleInspector}
            />
          ) : (
            <section className="panel panel--empty">
              <p>Toque em um território para ver detalhes e agir.</p>
            </section>
          )}

          {activeCollapseSummary(state).length > 0 ? (
            <section className="panel panel--collapse">
              <h3>Efeitos do Colapso ativos</h3>
              <ul>
                {activeCollapseSummary(state).map((effect) => (
                  <li key={effect.id}>
                    <b>{effect.name}</b> — {effect.description}
                    <small> até a rodada {effect.untilRound}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <AbilityFeed state={state} />
          <LogPanel state={state} />
        </aside>
      </div>

      <PhaseBar state={state} onAdvance={() => dispatch({ type: 'ADVANCE_PHASE' })} />

      <div className="hand">
        {hand.length === 0 ? (
          <p className="hand__empty">Sua mão está vazia.</p>
        ) : (
          hand.map((card, index) => (
            <GameCard
              key={card.instanceId as string}
              state={state}
              card={card}
              index={index}
              onOpen={setPreview}
            />
          ))
        )}
      </div>

      {preview ? (
        <CardPreview
          state={state}
          card={preview}
          onUse={(mode) => useCard(preview, mode)}
          onClose={() => setPreview(null)}
        />
      ) : null}

      {sequestro ? (
        <SequestroModal
          state={state}
          initialTerritoryId={selected}
          onClose={() => setSequestro(null)}
          onConfirm={(soldierIds: SoldierId[]) => {
            if (
              dispatch({
                type: 'PLAY_CARD',
                cardInstanceId: sequestro.instanceId,
                mode: 'PRIMARY',
                targetSoldierIds: soldierIds,
              })
            ) {
              setSequestro(null);
            }
          }}
        />
      ) : null}

      {state.pendingOccupation ? (
        <OccupationModal
          state={state}
          onConfirm={(amount) => dispatch({ type: 'OCCUPY_TERRITORY', amount })}
        />
      ) : null}

      {state.pendingDistribution ? (
        <DistributionModal
          state={state}
          onConfirm={(assignments) => dispatch({ type: 'DISTRIBUTE_RESERVES', assignments })}
        />
      ) : null}

      {state.collapse.pending ? (
        <CollapseOverlay state={state} onResolve={() => dispatch({ type: 'RESOLVE_COLLAPSE' })} />
      ) : null}

      {showMission ? <MissionPanel state={state} onClose={() => setShowMission(false)} /> : null}

      {finished ? (
        <VictoryOverlay state={state} onNewGame={goSetup} onHome={goHome} />
      ) : null}

      {error ? <div className="toast toast--error">{error}</div> : null}
      {notice && !error ? <div className="toast">{notice}</div> : null}

      <AnimationStage state={state} onAcknowledge={(id) => dispatch({ type: 'ACK_ANIMATION', eventId: id })} />

      <TutorialCoach />

      <DevPanel />
    </div>
  );
}
