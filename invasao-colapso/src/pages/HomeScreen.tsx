import { useGame } from '../hooks/useGame';
import { tutorialCompleted } from '../app/GameProvider';

/**
 * MENU PRINCIPAL — sala de comando, não formulário.
 *
 * A ação certa para cada pessoa fica em primeiro lugar: quem nunca jogou vê
 * o TUTORIAL destacado; quem tem partida salva vê CONTINUAR.
 */
export function HomeScreen() {
  const { goSetup, goOnline, goHowTo, startTutorialGame, continueGame, saveAvailable } = useGame();
  const veterano = tutorialCompleted();

  return (
    <div className="home">
      <div className="home__sky" aria-hidden="true" />
      <div className="home__inner">
        <p className="home__eyebrow">Estratégia territorial pós-Colapso</p>
        <h1 className="home__title">
          INVASÃO<span className="home__title-mark">:</span> COLAPSO
        </h1>
        <p className="home__tagline">
          Seis facções. Trinta territórios. Um mundo que age sozinho.
        </p>

        <nav className="home__actions" aria-label="Menu principal">
          {saveAvailable ? (
            <button type="button" className="menu-item menu-item--continue" onClick={continueGame}>
              <span className="menu-item__label">Continuar</span>
              <span className="menu-item__hint">Retomar a partida salva</span>
            </button>
          ) : null}

          <button type="button" className="menu-item menu-item--primary" onClick={goOnline}>
            <span className="menu-item__label">Jogar online</span>
            <span className="menu-item__hint">Criar sala ou entrar com um código</span>
          </button>

          <button type="button" className="menu-item" onClick={goSetup}>
            <span className="menu-item__label">Jogar local</span>
            <span className="menu-item__hint">2 a 6 jogadores no mesmo aparelho</span>
          </button>

          <button
            type="button"
            className={`menu-item${veterano ? '' : ' menu-item--suggested'}`}
            onClick={startTutorialGame}
          >
            <span className="menu-item__label">Tutorial</span>
            <span className="menu-item__hint">
              {veterano ? 'Rever a Primeira Batalha' : 'Aprenda jogando — 5 minutos'}
            </span>
          </button>

          <button type="button" className="menu-item menu-item--quiet" onClick={goHowTo}>
            <span className="menu-item__label">Como jogar</span>
            <span className="menu-item__hint">Consulta rápida das regras</span>
          </button>
        </nav>

        <p className="home__foot">
          Protótipo jogável · regras oficiais aprovadas · arte em desenvolvimento
        </p>
      </div>
    </div>
  );
}
