import { useMemo } from 'react';
import type { GameState } from '../../game/types/game.types';
import type { Territory } from '../../game/types/territory.types';
import type { TerritoryId } from '../../game/types/ids';
import { BOARD_HEIGHT, BOARD_REGIONS, BOARD_WIDTH, REGION_BY_ID } from '../../data/boardArt';
import { getFaction } from '../../game/factions/faction.registry';
import { BoardDefs } from './BoardDefs';
import { ArmyToken } from './ArmyToken';
import { useZoomPan } from '../map/useZoomPan';

export interface BoardProps {
  state: GameState;
  selectedId: TerritoryId | null;
  moveTargets: TerritoryId[];
  attackTargets: TerritoryId[];
  captureTargets: TerritoryId[];
  /** Vizinhos do território selecionado, para leitura de fronteira. */
  neighborIds: TerritoryId[];
  onSelect: (territory: Territory) => void;
}

/** Linha tática ligando origem e alvo — comunica a intenção do ataque. */
function TacticalLink({
  from,
  to,
  kind,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  kind: 'attack' | 'move';
}) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - 46;
  return (
    <path
      className={`tactical-link is-${kind}`}
      d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
      markerEnd={kind === 'attack' ? 'url(#ic-arrow)' : undefined}
    />
  );
}

export function Board({
  state,
  selectedId,
  moveTargets,
  attackTargets,
  captureTargets,
  neighborIds,
  onSelect,
}: BoardProps) {
  const { viewport, reset, zoomBy, wasDragged, handlers } = useZoomPan();
  const currentPlayerId = state.turn.currentPlayerId;

  const selectedAnchor = selectedId ? REGION_BY_ID.get(selectedId as string)?.anchor : undefined;

  const links = useMemo(() => {
    if (!selectedAnchor) return [];
    const build = (ids: TerritoryId[], kind: 'attack' | 'move') =>
      ids
        .map((id) => REGION_BY_ID.get(id as string)?.anchor)
        .filter((a): a is { x: number; y: number } => !!a)
        .map((anchor, index) => ({ anchor, kind, key: `${kind}-${index}` }));
    return [...build(attackTargets, 'attack'), ...build(moveTargets, 'move')];
  }, [selectedAnchor, attackTargets, moveTargets]);

  return (
    <div className="board">
      <div className="board__viewport" {...handlers}>
        <svg
          className="board__canvas"
          viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
        >
          <BoardDefs />
          <defs>
            <marker id="ic-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="tactical-link__head" />
            </marker>
          </defs>

          <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#ic-terrain)" />
          <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#ic-grid)" opacity="0.5" />

          <g className="board__regions">
            {BOARD_REGIONS.map((art) => {
              const territory = state.territories[art.id as string];
              if (!territory) return null;
              const controller = territory.controllerId
                ? state.players[territory.controllerId as string]
                : null;
              const faction = controller ? getFaction(controller.factionId) : null;
              const own = territory.controllerId === currentPlayerId;
              const neutral = !territory.controllerId;

              const classes = ['territory-node', own ? 'is-own' : neutral ? 'is-neutral' : 'is-enemy'];
              if (selectedId === territory.id) classes.push('is-selected');
              if (moveTargets.includes(territory.id)) classes.push('is-move-target');
              if (attackTargets.includes(territory.id)) classes.push('is-attack-target');
              if (captureTargets.includes(territory.id)) classes.push('is-capture-target');
              if (neighborIds.includes(territory.id)) classes.push('is-neighbor');
              if (state.pendingAttack?.toTerritoryId === territory.id) classes.push('is-under-attack');

              const color = faction?.color ?? '#5d6a7f';

              return (
                <g
                  key={art.id as string}
                  className={classes.join(' ')}
                  role="button"
                  tabIndex={0}
                  aria-label={`${territory.name}, controlado por ${controller?.name ?? 'Neutro'}, ${territory.garrison.length} soldados`}
                  onPointerUp={() => {
                    if (wasDragged()) return;
                    onSelect(territory);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelect(territory);
                  }}
                >
                  {/* Camada base: cor da facção em baixa saturação */}
                  <path className="territory-node__fill" d={art.path} style={{ fill: color }} />
                  {/* Textura: distingue aliado de hostil sem depender só da cor */}
                  <path
                    className="territory-node__texture"
                    d={art.path}
                    fill={neutral ? 'none' : own ? 'url(#ic-friendly)' : 'url(#ic-hostile)'}
                  />
                  <path className="territory-node__border" d={art.path} style={{ stroke: color }} />
                  <path className="territory-node__highlight" d={art.path} />

                  <text className="territory-node__terrain" x={art.anchor.x} y={art.anchor.y - 52}>
                    {art.terrain}
                  </text>
                  <text className="territory-node__name" x={art.anchor.x} y={art.anchor.y - 30}>
                    {territory.name}
                  </text>

                  <ArmyToken
                    x={art.anchor.x}
                    y={art.anchor.y + 14}
                    troops={territory.garrison.length}
                    color={color}
                    symbol={faction?.symbol ?? '·'}
                    own={own}
                    neutral={neutral}
                  />
                </g>
              );
            })}
          </g>

          {selectedAnchor && (
            <g className="board__links">
              {links.map((link) => (
                <TacticalLink key={link.key} from={selectedAnchor} to={link.anchor} kind={link.kind} />
              ))}
            </g>
          )}

          <rect
            className="board__grain"
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            filter="url(#ic-grain)"
            opacity="0.05"
            pointerEvents="none"
          />
        </svg>
      </div>

      <div className="board__controls" role="group" aria-label="Controles do mapa">
        <button type="button" className="btn btn--icon" onClick={() => zoomBy(1.2)} aria-label="Aproximar">
          +
        </button>
        <button type="button" className="btn btn--icon" onClick={() => zoomBy(0.83)} aria-label="Afastar">
          −
        </button>
        <button type="button" className="btn btn--icon" onClick={reset} aria-label="Resetar visualização">
          ⟳
        </button>
      </div>

      <div className="board__compass" aria-hidden="true">
        <span>N</span>
      </div>
    </div>
  );
}
