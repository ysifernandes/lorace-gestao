export interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

/** Seletor de quantidade com alvos grandes — pensado para o toque. */
export function NumberStepper({ value, min, max, onChange, label }: NumberStepperProps) {
  const clamp = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__controls">
        <button
          type="button"
          className="btn btn--round"
          onClick={() => clamp(value - 1)}
          disabled={value <= min}
          aria-label="Diminuir"
        >
          −
        </button>
        <output className="stepper__value">{value}</output>
        <button
          type="button"
          className="btn btn--round"
          onClick={() => clamp(value + 1)}
          disabled={value >= max}
          aria-label="Aumentar"
        >
          +
        </button>
      </div>
      <input
        className="stepper__range"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => clamp(Number(event.target.value))}
        aria-label={label}
      />
      <span className="stepper__hint">
        mín {min} · máx {max}
      </span>
    </div>
  );
}
