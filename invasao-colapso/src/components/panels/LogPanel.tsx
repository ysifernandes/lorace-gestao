import type { GameState } from '../../game/types/game.types';

export function LogPanel({ state }: { state: GameState }) {
  return (
    <section className="panel panel--log" aria-label="Registro da partida">
      <header className="panel__header">
        <h2 className="panel__title">Registro</h2>
      </header>
      <ol className="log">
        {state.log.slice(0, 12).map((entry) => (
          <li key={entry.id} className={`log__item log__item--${entry.level.toLowerCase()}`}>
            <span className="log__turn">T{entry.turn}</span>
            {entry.message}
          </li>
        ))}
      </ol>
    </section>
  );
}
