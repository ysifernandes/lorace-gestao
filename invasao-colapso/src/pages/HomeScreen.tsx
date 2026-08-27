import { useGame } from '../hooks/useGame';
import { GAME_TITLE } from '../data/lore';

export function HomeScreen() {
  const { goSetup, continueGame, saveAvailable, state } = useGame();
  const hasMatch = saveAvailable && Object.keys(state.players).length > 0;

  return (
    <div className="home">
      <div className="home__inner">
        <p className="home__eyebrow">Estratégia territorial pós-Colapso</p>
        <h1 className="home__title">{GAME_TITLE}</h1>
        <p className="home__lead">
          30 territórios. 6 regiões. 6 facções. A Malha caiu — e partes dela nunca receberam a
          ordem de parar.
        </p>
        <div className="home__actions">
          <button type="button" className="btn btn--primary btn--xl" onClick={goSetup}>
            Nova partida
          </button>
          {hasMatch ? (
            <button type="button" className="btn btn--ghost btn--xl" onClick={continueGame}>
              Continuar partida
            </button>
          ) : null}
        </div>
        <ul className="home__facts">
          <li>
            <b>30</b>
            <span>Territórios</span>
          </li>
          <li>
            <b>56</b>
            <span>Fronteiras</span>
          </li>
          <li>
            <b>30</b>
            <span>Missões secretas</span>
          </li>
          <li>
            <b>30</b>
            <span>Eventos do Colapso</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
