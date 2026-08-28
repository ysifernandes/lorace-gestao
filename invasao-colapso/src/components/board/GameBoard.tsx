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
import { TERRITORY_SEEDS } from '../../data/territories.seed';
import { isNeutral, territoryColor, visibleTroops } from '../../game/engine/selectors';
import { getFaction } from '../../game/factions/faction.registry';
import { useZoomPan } from '../map/useZoomPan';
import { CAMERA_LEVELS, CAMERA_LABEL, CAMERA_SCALE, LEVEL_DETAIL, cameraLevelFor } from '../../view/camera';
import type { CameraLevel } from '../../view/camera';
import { armyLod } from '../../view/armyLod';
import { unitSilhouette } from '../../view/factionArt';
import { FACTION_MARKER, REGION_ART_BY_ID, markerPath, motifPath } from '../../view/regionArt';

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

const POI_BY_TERRITORY = new Map(
  TERRITORY_SEEDS.filter((t) => t.poi).map((t) => [t.id as string, t.poi!]),
);

/** Um pelotão desenhado sobre o território, no detalhe do nível de câmera. */
function Army({
  factionId,
  color,
  secondary,
  troops,
  level,
  cx,
  cy,
}: {
  factionId: string;
  color: string;
  secondary: string;
  troops: number;
  level: CameraLevel;
  cx: number;
  cy: number;
}) {
  const lod = useMemo(() => armyLod(troops, level), [troops, level]);
  const art = useMemo(() => unitSilhouette(factionId as never), [factionId]);
  if (lod.slots.length === 0) return null;
  return (
    <g className="army" aria-hidden="true">
      {lod.slots.map((slot, index) => (
        <g
          key={index}
          transform={`translate(${cx + slot.dx} ${cy + slot.dy}) scale(${slot.scale.toFixed(2)})`}
        >
          <ellipse className="army__shadow" cx={0} cy={1} rx={5.4} ry={2} />
          <path d={art.body} fill={color} stroke="rgba(4,8,14,.85)" strokeWidth={0.9} />
          {art.headRadius > 0 && (
            <circle cx={0} cy={art.headY} r={art.headRadius} fill={color} stroke="rgba(4,8,14,.85)" strokeWidth={0.9} />
          )}
          <path
            d={art.crest}
            fill={secondary}
            stroke="rgba(4,8,14,.85)"
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        </g>
      ))}
      {lod.overflow > 0 && (
        <text className="army__overflow" x={cx} y={cy + 26} textAnchor="middle">
          +{lod.overflow}
        </text>
      )}
    </g>
  );
}

export function GameBoard({
  state,
  viewerId,
  selectedId,
  highlighted,
  originId,
  mode,
  onSelect,
}: GameBoardProps) {
  const { viewport, reset, zoomBy, zoomTo, wasDragged, handlers } = useZoomPan();
  const highlightSet = useMemo(() => new Set(highlighted.map(String)), [highlighted]);
  const tint = MODE_TINT[mode];

  const inBattle = state.pendingAttack?.status === 'DECLARED';
  const level = cameraLevelFor(viewport.scale, inBattle);
  const detail = LEVEL_DETAIL[level];

  const battleIds = useMemo(() => {
    const attack = state.pendingAttack;
    if (!attack || attack.status !== 'DECLARED') return new Set<string>();
    return new Set([attack.fromTerritoryId as string, attack.toTerritoryId as string]);
  }, [state.pendingAttack]);

  return (
    <div className="board" data-mode={mode} data-camera={level}>
      <div className="board__viewport" {...handlers}>
        <svg
          className="board__svg"
          viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="Mapa do Colapso"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
            </pattern>
            <radialGradient id="board-vignette" cx="50%" cy="42%" r="72%">
              <stop offset="55%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(2,5,10,.72)" />
            </radialGradient>
            <filter id="landmass-blur" x="-12%" y="-12%" width="124%" height="124%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <filter id="territory-depth" x="-30%" y="-30%" width="160%" height="180%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="rgba(2,5,10,.72)" />
            </filter>
          </defs>
          <g
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
              transformOrigin: '50% 50%',
            }}
          >
            <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#grid)" />

            {/* Massas de terra: a região existe como TERRENO, não como legenda. */}
            <g className="board__landmasses">
              {REGION_SHAPES.map((region) => {
                const art = REGION_ART_BY_ID.get(region.id);
                const xs = region.blobs.map((b) => b.x);
                const ys = region.blobs.map((b) => b.y);
                const left = Math.min(...xs) - 70;
                const right = Math.max(...xs) + 70;
                const bottom = Math.max(...ys) + 74;
                const width = right - left;
                return (
                  <g key={region.id}>
                    {/* Massa de terra: a região existe como TERRENO. */}
                    <g className="board__landmass" fill={art?.ground ?? region.color}>
                      {region.blobs.map((blob, index) => (
                        <circle key={index} cx={blob.x} cy={blob.y} r={blob.r} />
                      ))}
                    </g>
                    {/* Silhueta do relevo: montanha, cidade, ruína, água,
                        floresta ou cratera — dá para reconhecer sem ler. */}
                    {art && detail.regionName ? (
                      <g
                        className={`board__motif board__motif--${art.motif.toLowerCase()}`}
                        transform={`translate(${left} ${bottom - 44}) scale(${width / 100} 1.1)`}
                        fill={region.color}
                      >
                        <path d={motifPath(art.motif)} />
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </g>

            {detail.regionName &&
              REGION_SHAPES.map((region) => (
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
                  <g key={`${link.a}-${link.b}`}>
                    <line
                      x1={a.center.x}
                      y1={a.center.y}
                      x2={b.center.x}
                      y2={b.center.y}
                      className={`board__link board__link--${link.kind.toLowerCase()}${
                        disabled ? ' board__link--off' : ''
                      }`}
                    />
                    {detail.linkNames && link.name && (
                      <text
                        className="board__link-label"
                        x={(a.center.x + b.center.x) / 2}
                        y={(a.center.y + b.center.y) / 2 - 6}
                        textAnchor="middle"
                      >
                        {link.name}
                      </text>
                    )}
                  </g>
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
              const fighting = battleIds.has(shape.id as string);
              const troops = visibleTroops(state, territory, viewerId);
              const controller = territory.controllerId
                ? state.players[territory.controllerId as string]
                : null;
              const faction = controller ? getFaction(controller.factionId) : null;
              const poi = POI_BY_TERRITORY.get(shape.id as string);
              const showFigures = detail.figures && troops.exact !== null;
              return (
                <g
                  key={shape.id as string}
                  className={
                    'territory' +
                    (selected ? ' territory--selected' : '') +
                    (origin ? ' territory--origin' : '') +
                    (target ? ' territory--target' : '') +
                    (neutral ? ' territory--neutral' : '') +
                    (fighting ? ' territory--fighting' : '')
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
                  {/* Base extrudada: dá volume de miniatura ao território. */}
                  <path className="territory__base" d={shape.path} transform="translate(0 7)" />
                  <path
                    className="territory__top"
                    d={shape.path}
                    fill={color}
                    fillOpacity={neutral ? 0.3 : 0.66}
                    stroke={target ? tint : selected ? '#ffffff' : 'rgba(6,10,16,.75)'}
                    strokeWidth={target || selected ? 3.5 : 1.6}
                    filter="url(#territory-depth)"
                  />
                  {poi && (
                    <g className="territory__poi" transform={`translate(${shape.center.x} ${shape.center.y - 32})`}>
                      <path d="M 0 -8 L 7 0 L 0 8 L -7 0 Z" fill="rgba(4,8,14,.8)" stroke={color} strokeWidth={1.6} />
                      <text className="territory__poi-mark" y={3.5} textAnchor="middle">
                        ★
                      </text>
                    </g>
                  )}
                  {/* O mapa não depende só da cor: cada facção tem também um
                      formato de marcador próprio, legível em tons de cinza. */}
                  {faction ? (
                    <g
                      className="territory__marker"
                      transform={`translate(${shape.center.x - 26} ${shape.center.y - 22}) scale(0.9)`}
                      aria-hidden="true"
                    >
                      <circle r="10" fill="rgba(4,8,14,.82)" stroke={color} strokeWidth={1.6} />
                      <path
                        d={markerPath(FACTION_MARKER[faction.id as string] ?? 'DOT')}
                        fill={color}
                        transform="scale(0.72)"
                      />
                    </g>
                  ) : null}
                  {detail.territoryName && (
                    <text className="territory__name" x={shape.center.x} y={shape.center.y - 18}>
                      {shape.name}
                    </text>
                  )}
                  {showFigures && faction && (
                    <Army
                      factionId={faction.id as string}
                      color={faction.color}
                      secondary={faction.secondaryColor ?? faction.color}
                      troops={troops.exact ?? 0}
                      level={level}
                      cx={shape.center.x}
                      cy={shape.center.y + 12}
                    />
                  )}
                  {detail.badge && (
                    <>
                      <circle
                        className="territory__badge"
                        cx={shape.center.x}
                        cy={shape.center.y + (showFigures ? 30 : 12)}
                        r={15}
                        fill="rgba(4,8,14,.86)"
                        stroke={color}
                        strokeWidth={2}
                      />
                      <text
                        className="territory__troops"
                        x={shape.center.x}
                        y={shape.center.y + (showFigures ? 35 : 17)}
                      >
                        {troops.label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
          <rect
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            fill="url(#board-vignette)"
            pointerEvents="none"
          />
        </svg>
      </div>

      {/* Níveis de câmera: MUNDO → REGIÃO → TERRITÓRIO → COMBATE */}
      <div className="board__camera" role="group" aria-label="Nível de câmera">
        {CAMERA_LEVELS.map((option) => (
          <button
            key={option}
            type="button"
            className={`board__camera-btn${option === level ? ' is-active' : ''}`}
            aria-pressed={option === level}
            disabled={option === 'COMBATE' && !inBattle}
            onClick={() => zoomTo(CAMERA_SCALE[option])}
          >
            {CAMERA_LABEL[option]}
          </button>
        ))}
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
