import { GameProvider } from './app/GameProvider';
import { GamePage } from './pages/GamePage';
import './styles/global.css';

export default function App() {
  return (
    <GameProvider>
      <GamePage />
    </GameProvider>
  );
}
