import { useMemo } from 'react';
import type { GameState } from '../../game/types/game.types';
import type { Territory } from '../../game/types/territory.types';
import type { TerritoryId } from '../../game/types/ids';
import { MAP_HEIGHT, MAP_WIDTH } from '../../data/territories.seed';

/** Margem ao redor do mapa lógico: impede que os cards das bordas sejam cortados. */
const MARGIN = 110;
import { controllerName, territoryColor } from '../../game/engine/selectors';
import { TerritoryNode } from './TerritoryNode';
import type { TerritoryVisualState } from './TerritoryNode';
import { useZoomPan } from './useZoomPan';

export interface MapViewProps {
  state: GameState;
  selectedId: TerritoryId | null;
  moveTargets: TerritoryId[];
  attackTargets: TerritoryId[];
  captureTargets: TerritoryId[];
  onSelect: (territory: Territory) => void;
}

export function MapView({
  state,
  selectedId,
  moveTargets,
  attackTargets,
  captureTargets,
  onSelect,
}: MapViewProps) {
  const { viewport, reset, zoomBy, wasDragged, handlers } = useZoomPan();
  const territories = useMemo(() => Object.values(state.territories), [state.territories]);

  // Cada fronteira desenhada uma única vez.
  const borders = useMemo(() => {
    const seen = new Set<string>();
    const lines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const territory of territories) {
      for (const neighborId of territory.neighbors) {
        const neighbor = state.territories[neighborId as string];
        if (!neighbor) continue;
        const key = [territory.id, neighbor.id].sort().join('~');
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push({
          key,
          x1: territory.position?.x ?? 0,
          y1: territory.position?.y ?? 0,
          x2: neighbor.position?.x ?? 0,
          y2: neighbor.position?.y ?? 0,
        });
      }
    }
    return lines;
  }, [territories, state.territories]);

  const currentPlayerId = state.turn.currentPlayerId;

  function visualFor(territory: Territory): TerritoryVisualState[] {
    const visual: TerritoryVisualState[] = [];
    if (!territory.controllerId) visual.push('NEUTRAL');
    else if (territory.controllerId === currentPlayerId) visual.push('OWN');
    else visual.push('ENEMY');
    if (selectedId === territory.id) visual.push('SELECTED');
    if (moveTargets.includes(territory.id)) visual.push('MOVE_TARGET');
    if (attackTargets.includes(territory.id)) visual.push('ATTACK_TARGET');
    if (captureTargets.includes(territory.id)) visual.push('CAPTURE_TARGET');
    if (state.pendingAttack?.toTerritoryId === territory.id) visual.push('UNDER_ATTACK');
    return visual;
  }

  return (
    <div className="map">
      <div className="map__viewport" {...handlers}>
        <svg
          className="map__canvas"
          viewBox={`${-MARGIN} ${-MARGIN} ${MAP_WIDTH + MARGIN * 2} ${MAP_HEIGHT + MARGIN * 2}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          }}
        >
          <g className="map__borders">
            {borders.map((line) => (
              <line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
            ))}
          </g>
          {territories.map((territory) => (
            <TerritoryNode
              key={territory.id as string}
              territory={territory}
              troops={territory.garrison.length}
              color={territoryColor(state, territory)}
              controllerName={controllerName(state, territory)}
              visual={visualFor(territory)}
              onSelect={(t) => {
                if (wasDragged()) return;
                onSelect(t);
              }}
            />
          ))}
        </svg>
      </div>

      <div className="map__controls" role="group" aria-label="Controles do mapa">
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
    </div>
  );
}
