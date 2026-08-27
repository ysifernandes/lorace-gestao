const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
};

/** Dado estilizado. Usado na prévia de batalha e no resultado da Vacina. */
export function Die({
  value,
  tone = 'neutral',
}: {
  /** null = dado ainda não rolado (prévia). */
  value: number | null;
  tone?: 'attack' | 'defense' | 'neutral';
}) {
  const pips = value === null ? [] : (PIPS[Math.min(6, Math.max(1, Math.round(value)))] ?? PIPS[1]);
  return (
    <svg
      className={`die is-${tone}${value === null ? ' die--blank' : ''}`}
      viewBox="0 0 100 100"
      role="img"
      aria-label={value === null ? 'Dado a rolar' : `Dado ${value}`}
    >
      <rect className="die__body" x="6" y="6" width="88" height="88" rx="18" />
      <rect className="die__edge" x="6" y="6" width="88" height="88" rx="18" />
      {pips.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} className="die__pip" cx={cx} cy={cy} r="8.5" />
      ))}
    </svg>
  );
}
