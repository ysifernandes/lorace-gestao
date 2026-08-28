import { useEffect, useMemo, useState } from 'react';
import { planDiceRoll } from '../../view/diceRoll';
import type { DieAnimation, DiceRollPlan } from '../../view/diceRoll';
import type { BattleRound } from '../../game/types/game.types';
import { audio } from '../../view/audio/audioBus';

/**
 * ARENA DOS DADOS.
 *
 * Recebe a rodada JÁ RESOLVIDA pelo motor (ou pelo servidor) e encena:
 * os dados entram, giram, quicam e param — exatamente nos valores oficiais.
 * Nenhum número é sorteado aqui.
 */
export interface DiceArenaProps {
  round: BattleRound;
  /** Semente da coreografia. No online vem do servidor: todos veem igual. */
  seed: number;
  attackerColor: string;
  defenderColor: string;
  onFinished?: () => void;
}

type Phase = 'ROLLING' | 'COMPARING' | 'DONE';

export function DiceArena({
  round,
  seed,
  attackerColor,
  defenderColor,
  onFinished,
}: DiceArenaProps) {
  const plan: DiceRollPlan = useMemo(
    () => planDiceRoll(round.attackerDice, round.defenderDice, { seed }),
    [round, seed],
  );
  const [elapsed, setElapsed] = useState(0);
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    [],
  );

  // A trilha sonora sai do MESMO plano da animação: cada dado que entra,
  // quica e assenta tem seu som no instante exato em que isso é desenhado.
  useEffect(() => {
    if (reduced) return;
    const steps: { id: 'dice.enter' | 'dice.impact' | 'dice.bounce' | 'dice.settle'; atMs: number }[] = [];
    for (const die of [...plan.attacker, ...plan.defender]) {
      steps.push({ id: 'dice.enter', atMs: die.enterDelayMs });
      steps.push({ id: 'dice.impact', atMs: die.enterDelayMs + die.spinMs * 0.45 });
      for (let bounce = 1; bounce <= die.bounces; bounce += 1) {
        steps.push({ id: 'dice.bounce', atMs: die.enterDelayMs + die.spinMs * (0.55 + bounce * 0.12) });
      }
      steps.push({ id: 'dice.settle', atMs: die.settleAtMs });
    }
    for (const comparison of plan.comparisons) {
      steps.push({ id: 'dice.impact', atMs: comparison.atMs });
    }
    audio.playSequence(steps);
  }, [plan, reduced]);

  useEffect(() => {
    if (reduced) {
      setElapsed(plan.totalMs);
      onFinished?.();
      return;
    }
    setElapsed(0);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick() {
      const now = performance.now() - start;
      setElapsed(now);
      if (now < plan.totalMs) frame = requestAnimationFrame(tick);
      else onFinished?.();
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, reduced]);

  const phase: Phase =
    elapsed < plan.allSettledAtMs ? 'ROLLING' : elapsed < plan.casualtiesAtMs ? 'COMPARING' : 'DONE';

  const revealed = plan.comparisons.filter((c) => elapsed >= c.atMs);
  const current = revealed[revealed.length - 1] ?? null;

  return (
    <div className="arena" data-phase={phase}>
      <div className="arena__side" style={{ '--fc': attackerColor } as React.CSSProperties}>
        <span className="arena__label">Atacante</span>
        <div className="arena__dice">
          {plan.attacker.map((die) => (
            <DieFace key={`a${die.index}`} die={die} elapsed={elapsed} color={attackerColor} />
          ))}
        </div>
      </div>

      <div className="arena__center">
        {phase === 'ROLLING' ? (
          <span className="arena__verdict arena__verdict--rolling">rolando…</span>
        ) : current ? (
          <span
            className={`arena__verdict arena__verdict--${current.winner.toLowerCase()}`}
            role="status"
          >
            <em>
              {current.attacker} × {current.defender}
            </em>
            <strong>
              {current.tie
                ? 'Empate — defensor vence'
                : current.winner === 'ATTACKER'
                  ? 'Atacante vence'
                  : 'Defensor vence'}
            </strong>
          </span>
        ) : (
          <span className="arena__verdict">comparando…</span>
        )}

        {phase === 'DONE' ? (
          <p className="arena__losses">
            Atacante −{round.attackerLosses} · Defensor −{round.defenderLosses}
          </p>
        ) : null}
      </div>

      <div className="arena__side" style={{ '--fc': defenderColor } as React.CSSProperties}>
        <span className="arena__label">Defensor</span>
        <div className="arena__dice">
          {plan.defender.map((die) => (
            <DieFace key={`d${die.index}`} die={die} elapsed={elapsed} color={defenderColor} />
          ))}
        </div>
      </div>
    </div>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

function DieFace({
  die,
  elapsed,
  color,
}: {
  die: DieAnimation;
  elapsed: number;
  color: string;
}) {
  const entered = elapsed >= die.enterDelayMs;
  const settled = elapsed >= die.settleAtMs;
  const spinning = entered && !settled;
  const progress = spinning
    ? (elapsed - die.enterDelayMs) / Math.max(1, die.settleAtMs - die.enterDelayMs)
    : 1;

  // Enquanto gira, as faces trocam — decoração. O valor final é sempre
  // `die.value`, que veio do motor.
  const shown = settled ? die.value : 1 + ((Math.floor(elapsed / 70) + die.index) % 6);

  return (
    <div
      className={`die3d${entered ? ' is-in' : ''}${settled ? ' is-settled' : ''}`}
      style={
        {
          '--fc': color,
          '--spin': `${die.spinDegrees * (1 - progress)}deg`,
          '--drift': `${die.driftX * (1 - progress)}px`,
          '--lift': `${spinning ? Math.abs(Math.sin(progress * Math.PI * die.bounces)) * 22 : 0}px`,
        } as React.CSSProperties
      }
      aria-label={settled ? `Dado ${die.value}` : 'Dado rolando'}
      data-value={settled ? die.value : undefined}
    >
      <svg viewBox="0 0 100 100" className="die3d__face">
        <rect x="4" y="4" width="92" height="92" rx="18" className="die3d__body" />
        {PIPS[shown]?.map(([cx, cy], index) => (
          <circle key={index} cx={cx} cy={cy} r="8.5" className="die3d__pip" />
        ))}
      </svg>
    </div>
  );
}
