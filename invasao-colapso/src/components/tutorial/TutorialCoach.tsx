import { useGame } from '../../hooks/useGame';
import { listTutorialSteps } from '../../game/tutorial';

/**
 * CARTÃO DO TUTORIAL.
 *
 * Fica visível durante a Primeira Batalha sem bloquear o mapa. Passo de
 * leitura avança no botão; passo de ação só libera quando o motor confirma
 * que a jogada aconteceu de verdade.
 */
export function TutorialCoach() {
  const { tutorial, tutorialStep, tutorialReady, advanceTutorialStep, endTutorial } = useGame();
  if (!tutorial || !tutorialStep || tutorial.finished) return null;

  const total = listTutorialSteps().length;
  const acao = tutorialStep.advance.kind === 'DO';

  return (
    <aside className="coach" role="complementary" aria-label="Tutorial">
      <header className="coach__head">
        <span className="coach__count">
          Passo {tutorial.stepIndex + 1} de {total}
        </span>
        <button type="button" className="coach__skip" onClick={endTutorial}>
          Pular tutorial
        </button>
      </header>

      <h2 className="coach__title">{tutorialStep.title}</h2>
      <p className="coach__body">{tutorialStep.body}</p>
      {tutorialStep.rule ? <p className="coach__rule">{tutorialStep.rule}</p> : null}

      <div className="coach__foot">
        {acao && !tutorialReady && tutorialStep.advance.kind === 'DO' ? (
          <p className="coach__hint" role="status">
            {tutorialStep.advance.hint}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn--primary coach__next"
          disabled={acao && !tutorialReady}
          onClick={advanceTutorialStep}
        >
          {acao
            ? tutorialReady
              ? 'Feito — continuar'
              : 'Faça a ação para continuar'
            : tutorialStep.advance.kind === 'CONFIRM'
              ? tutorialStep.advance.label
              : 'Continuar'}
        </button>
      </div>

      <div className="coach__progress" aria-hidden="true">
        <span style={{ width: `${((tutorial.stepIndex + 1) / total) * 100}%` }} />
      </div>
    </aside>
  );
}
