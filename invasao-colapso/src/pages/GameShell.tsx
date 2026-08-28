import { useGame } from '../hooks/useGame';
import { HomeScreen } from './HomeScreen';
import { SetupScreen } from './SetupScreen';
import { MatchScreen } from './MatchScreen';
import { OnlineScreen } from './OnlineScreen';
import { LobbyScreen } from './LobbyScreen';
import { HowToScreen } from './HowToScreen';

/** Fluxo de telas: menu → local / online / tutorial / consulta → partida. */
export function GameShell() {
  const { screen } = useGame();
  switch (screen) {
    case 'HOME':
      return <HomeScreen />;
    case 'SETUP':
      return <SetupScreen />;
    case 'ONLINE':
      return <OnlineScreen />;
    case 'LOBBY':
      return <LobbyScreen />;
    case 'HOWTO':
      return <HowToScreen />;
    default:
      return <MatchScreen />;
  }
}
