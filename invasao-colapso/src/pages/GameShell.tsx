import { useGame } from '../hooks/useGame';
import { HomeScreen } from './HomeScreen';
import { SetupScreen } from './SetupScreen';
import { MatchScreen } from './MatchScreen';

/** Fluxo de telas: início → configuração → partida. */
export function GameShell() {
  const { screen } = useGame();
  if (screen === 'HOME') return <HomeScreen />;
  if (screen === 'SETUP') return <SetupScreen />;
  return <MatchScreen />;
}
