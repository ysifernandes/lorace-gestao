import { useGame } from '../hooks/useGame';
import { TURN_PHASES } from '../game/types/turn.types';
import { PHASE_LABELS } from '../game/turns/phases';
import { BALANCE } from '../game/config/balance';

/**
 * COMO JOGAR — consulta rápida, não manual.
 *
 * Todos os números vêm de `BALANCE` e das fases oficiais: se a regra mudar,
 * esta tela muda junto. Nada aqui é texto solto repetindo o motor.
 */
const PHASE_HELP: Record<string, string> = {
  REFORCO: 'Receba e distribua tropas nos seus territórios.',
  ATAQUE_COMUM: 'Um único ataque contra um território inimigo vizinho.',
  ATAQUE_ESPECIAL: 'O Transporte leva tropas a um alvo a exatamente 2 de distância.',
  MOVIMENTACAO: 'Reposicione tropas entre territórios seus que fazem fronteira.',
  CARTAS: 'Compre (se conquistou) e jogue cartas.',
  FIM_TURNO: 'Encerre e passe a vez.',
};

export function HowToScreen() {
  const { goHome, startTutorialGame } = useGame();

  return (
    <div className="howto">
      <header className="setup__head">
        <button type="button" className="btn btn--ghost" onClick={goHome}>
          ← Voltar
        </button>
        <h1>Como jogar</h1>
      </header>

      <section className="howto__block">
        <h2>O objetivo</h2>
        <p>
          Cada jogador recebe um <strong>objetivo secreto</strong>. Cumprir o seu vence a partida na
          hora. Também vence quem dominar todos os 30 territórios ou ficar sozinho em pé. Na rodada{' '}
          {BALANCE.victory.roundLimit} a partida termina e o desempate é por regiões completas,
          depois territórios, depois soldados.
        </p>
      </section>

      <section className="howto__block">
        <h2>As seis fases do turno</h2>
        <ol className="howto__phases">
          {TURN_PHASES.map((phase, index) => (
            <li key={phase}>
              <span className="howto__phase-num">{index + 1}</span>
              <div>
                <strong>{PHASE_LABELS[phase]}</strong>
                <p>{PHASE_HELP[phase]}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="howto__block">
        <h2>Combate</h2>
        <ul className="howto__list">
          <li>
            Atacante rola até {BALANCE.dice.maxAttackDice} dados e precisa deixar{' '}
            {BALANCE.territory.minGarrison} soldado na origem.
          </li>
          <li>Defensor rola até {BALANCE.dice.maxDefenseDice} dados.</li>
          <li>Os dados são ordenados do maior para o menor e comparados par a par.</li>
          <li>
            <strong>Empate favorece o defensor.</strong> Cada comparação perdida elimina 1 soldado.
          </li>
          <li>Várias rodadas contra o mesmo território ainda são UM único ataque.</li>
          <li>Por rota marítima o atacante fica limitado a {BALANCE.dice.maritimeAttackDice} dados.</li>
        </ul>
      </section>

      <section className="howto__block">
        <h2>Limites por turno</h2>
        <ul className="howto__list">
          <li>1 Ataque Comum.</li>
          <li>Até 1 Ataque Especial (gasta carga de Transporte).</li>
          <li>Compra de carta só depois de conquistar algo no turno.</li>
        </ul>
      </section>

      <div className="howto__cta">
        <button type="button" className="btn btn--primary btn--xl" onClick={startTutorialGame}>
          Aprender jogando
        </button>
      </div>
    </div>
  );
}
