import { useMemo } from 'react';
import type { GameState } from '../../game/types/game.types';
import type { PlayerId, TerritoryId } from '../../game/types/ids';
import {
  BOARD_HEIGHT,
  BOARD_LINKS,
  BOARD_WIDTH,
  REGION_SHAPES,
  SHAPE_BY_ID,
  TERRITORY_SHAPES,
} from '../../data/boardArt';
import { isNeutral, territoryColor, visibleTroops } from '../../game/engine/selectors';
import { useZoomPan } from '../map/useZoomPan';

export type BoardMode = 'IDLE' | 'REINFORCE' | 'ATTACK' | 'SPECIAL' | 'MOVE' | 'CARD_TARGET';

export interface GameBoardProps {
  state: GameState;
  viewerId: PlayerId;
  selectedId: TerritoryId | null;
  highlighted: TerritoryId[];
  originId: TerritoryId | null;
  mode: BoardMode;
  onSelect: (id: TerritoryId) => void;
}

const MODE_TINT: Record<BoardMode, string> = {
  IDLE: '#8fa3bf',
  REINFORCE: '#4ec37a',
  ATTACK: '#e5533d',
  SPECIAL: '#f0a33a',
  MOVE: '#4aa3e0',
  CARD_TARGET: '#a874e8',
};

export function GameBoard({
  state,
  viewerId,
  selectedId,
  highlighted,
  originId,
  mode,
  onSelect,
}: GameBoardProps) {
  const { viewport, reset, zoomBy, wasDragged, handlers } = useZoomPan();
  const highlightSet = useMemo(() => new Set(highlighted.map(String)), [highlighted]);
  const tint = MODE_TINT[mode];

  return (
    <div className="board" data-mode={mode}>
      <div className="board__viewport" {...handlers}>
        <svg
          className="board__svg"
          viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="Mapa da Bacia"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
            </pattern>
          </defs>
          <g
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
              transformOrigin: '50% 50%',
            }}
          >
            <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#grid)" />

            {/* Regiões como marca d'água, atrás de tudo: informam sem competir. */}
            {REGION_SHAPES.map((region) => (
              <text
                key={region.id}
                className="board__region-label"
                x={region.label.x}
                y={region.label.y}
                textAnchor="middle"
                fill={region.color}
              >
                {region.name} · +{region.bonus}
              </text>
            ))}


            {/* Fronteiras: a verdade da adjacência, desenhada */}
            <g className="board__links">
              {BOARD_LINKS.map((link) => {
                const a = SHAPE_BY_ID.get(link.a as string);
                const b = SHAPE_BY_ID.get(link.b as string);
                if (!a || !b) return null;
                const disabled = state.disabledLinks.some(
                  (entry) =>
                    (entry.a === link.a && entry.b === link.b) ||
                    (entry.a === link.b && entry.b === link.a),
                );
                return (
                  <line
                    key={`${link.a}-${link.b}`}
                    x1={a.center.x}
                    y1={a.center.y}
                    x2={b.center.x}
                    y2={b.center.y}
                    className={`board__link board__link--${link.kind.toLowerCase()}${
                      disabled ? ' board__link--off' : ''
                    }`}
                  />
                );
              })}
            </g>

            {/* Territórios */}
            {TERRITORY_SHAPES.map((shape) => {
              const territory = state.territories[shape.id as string];
              if (!territory) return null;
              const color = territoryColor(state, territory);
              const neutral = isNeutral(state, territory);
              const selected = selectedId === shape.id;
              const origin = originId === shape.id;
              const target = highlightSet.has(shape.id as string);
              const troops = visibleTroops(state, territory, viewerId);
              return (
                <g
                  key={shape.id as string}
                  className={
                    'territory' +
                    (selected ? ' territory--selected' : '') +
                    (origin ? ' territory--origin' : '') +
                    (target ? ' territory--target' : '') +
                    (neutral ? ' territory--neutral' : '')
                  }
                  onPointerUp={() => {
                    if (wasDragged()) return;
                    onSelect(shape.id);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${shape.name}, ${troops.label} tropas`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelect(shape.id);
                  }}
                >
                  <path
                    d={shape.path}
                    fill={color}
                    fillOpacity={neutral ? 0.28 : 0.62}
                    stroke={target ? tint : selected ? '#ffffff' : 'rgba(6,10,16,.75)'}
                    strokeWidth={target || selected ? 3.5 : 1.6}
                  />
                  <text className="territory__name" x={shape.center.x} y={shape.center.y - 12}>
                    {shape.name}
                  </text>
                  <circle
                    className="territory__badge"
                    cx={shape.center.x}
                    cy={shape.center.y + 12}
                    r={15}
                    fill="rgba(4,8,14,.82)"
                    stroke={color}
                    strokeWidth={2}
                  />
                  <text className="territory__troops" x={shape.center.x} y={shape.center.y + 17}>
                    {troops.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="board__controls">
        <button type="button" onClick={() => zoomBy(1.2)} aria-label="Aproximar">
          +
        </button>
        <button type="button" onClick={() => zoomBy(0.83)} aria-label="Afastar">
          −
        </button>
        <button type="button" onClick={reset} aria-label="Centralizar">
          ⟲
        </button>
      </div>
    </div>
  );
}
