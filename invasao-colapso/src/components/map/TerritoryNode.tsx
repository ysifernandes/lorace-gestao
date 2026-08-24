import type { Territory } from '../../game/types/territory.types';

export type TerritoryVisualState =
  | 'OWN'
  | 'ENEMY'
  | 'NEUTRAL'
  | 'SELECTED'
  | 'MOVE_TARGET'
  | 'ATTACK_TARGET'
  | 'UNDER_ATTACK'
  | 'CAPTURE_TARGET';

export interface TerritoryNodeProps {
  territory: Territory;
  troops: number;
  color: string;
  controllerName: string;
  visual: TerritoryVisualState[];
  onSelect: (territory: Territory) => void;
}

const NODE_WIDTH = 168;
const NODE_HEIGHT = 84;

export function TerritoryNode({
  territory,
  troops,
  color,
  controllerName,
  visual,
  onSelect,
}: TerritoryNodeProps) {
  const x = territory.position?.x ?? 0;
  const y = territory.position?.y ?? 0;
  const classes = ['territory-node', ...visual.map((v) => `is-${v.toLowerCase().replace('_', '-')}`)];

  return (
    <g
      className={classes.join(' ')}
      transform={`translate(${x - NODE_WIDTH / 2} ${y - NODE_HEIGHT / 2})`}
      // Sem stopPropagation: o mapa precisa receber o pointerup para encerrar
      // o gesto de pan. Ele já ignora a seleção quando houve arrasto.
      onPointerUp={() => onSelect(territory)}
      role="button"
      tabIndex={0}
      aria-label={`${territory.name}, controlado por ${controllerName}, ${troops} soldados`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect(territory);
      }}
    >
      <rect
        className="territory-node__shape"
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={14}
        style={{ fill: color }}
      />
      <rect className="territory-node__outline" width={NODE_WIDTH} height={NODE_HEIGHT} rx={14} />
      <text
        className="territory-node__name"
        x={12}
        y={26}
        /* Nomes longos encolhem para não vazar do card. */
        style={{ fontSize: territory.name.length > 15 ? 14 : 17 }}
      >
        {territory.name}
      </text>
      <text className="territory-node__controller" x={12} y={46}>
        {controllerName}
      </text>
      <g transform={`translate(${NODE_WIDTH - 44} ${NODE_HEIGHT - 34})`}>
        <circle className="territory-node__badge" cx={16} cy={16} r={17} />
        <text className="territory-node__troops" x={16} y={22}>
          {troops}
        </text>
      </g>
      {visual.includes('UNDER_ATTACK') && (
        <text className="territory-node__flag" x={12} y={NODE_HEIGHT - 12}>
          ⚔ sob ataque
        </text>
      )}
      {visual.includes('CAPTURE_TARGET') && (
        <text className="territory-node__flag" x={12} y={NODE_HEIGHT - 12}>
          🚁 alvo do sequestro
        </text>
      )}
    </g>
  );
}
