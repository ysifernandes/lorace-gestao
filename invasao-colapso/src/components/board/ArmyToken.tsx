export interface ArmyTokenProps {
  x: number;
  y: number;
  troops: number;
  color: string;
  symbol: string;
  /** Território do jogador da vez. */
  own: boolean;
  neutral: boolean;
}

/**
 * Marcador do exército: chapa hexagonal com o símbolo da facção e a contagem.
 * Comunica "existe um exército aqui" sem precisar escrever o nome da facção.
 */
export function ArmyToken({ x, y, troops, color, symbol, own, neutral }: ArmyTokenProps) {
  // Hexágono achatado — leitura militar, distinta de um simples círculo.
  const r = 26;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(x + r * Math.cos(angle)).toFixed(1)},${(y + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');

  return (
    <g className={`army-token${own ? ' is-own' : ''}${neutral ? ' is-neutral' : ''}`}>
      <polygon className="army-token__plate" points={hex} style={{ stroke: color }} />
      <polygon className="army-token__inner" points={hex} style={{ fill: color }} />
      <text className="army-token__symbol" x={x} y={y - 6}>
        {symbol}
      </text>
      <text className="army-token__count" x={x} y={y + 15}>
        {troops}
      </text>
    </g>
  );
}
