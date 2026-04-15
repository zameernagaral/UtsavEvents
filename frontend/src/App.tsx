import { useEffect } from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';

import { GameProvider } from '@/context/game-context';
import Home from '@/pages/Home';
import GameFormats from '@/pages/GameFormats';
import GameSetup from '@/pages/GameSetup';
import MiniGame from '@/pages/MiniGame';
import PuzzlesPage from '@/pages/Puzzles';
import GamePlay from '@/pages/GamePlay';
import GameRules from '@/pages/GameRules';
import GameRulesMain from '@/pages/GameRulesMain';
import GameCommonRules from '@/pages/GameCommonRules';
import GameHarmonyRules from '@/pages/GameHarmonyRules';
import AdminPage from '@/pages/Admin';
import LeaderboardPage from '@/pages/Leaderboard';
import { API_BASE_URL } from '@/lib/api';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkEventStatus = async () => {
      if (
        location.pathname.startsWith('/admin') || 
        location.pathname === '/' ||
        location.pathname.includes('rules') ||
        location.pathname === '/game'
      ) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/event/status`);
        if (!response.ok) return;
        const data = await response.json();

        switch(data.current_phase) {
          case 'registration':
            if (!location.pathname.startsWith('/game/setup')) navigate('/game/setup');
            break;
          case 'mini_game_1':
            if (!location.pathname.startsWith('/game/mini-game')) navigate('/game/mini-game');
            break;
          case 'mini_game_2':
            if (!location.pathname.startsWith('/game/puzzles')) navigate('/game/puzzles');
            break;
          case 'qualifiers':
          case 'swiss_stage':
          case 'round_robin_top6':
          case 'finals':
            if (!location.pathname.startsWith('/game/play')) {
              navigate('/game/setup');
            }
            break;
          case 'elimination_cut':
          case 'completed':
            if (!location.pathname.startsWith('/leaderboard')) navigate('/leaderboard');
            break;
        }
      } catch (error) {
        console.error('Failed to fetch event status', error);
      }
    };

    checkEventStatus();

    const intervalId = setInterval(checkEventStatus, 5000);
    return () => clearInterval(intervalId);
  }, [navigate, location.pathname]);

  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<GameFormats />} />
        <Route path="/game/setup" element={<GameSetup />} />
        <Route path="/game/mini-game" element={<MiniGame />} />
        <Route path="/game/puzzles" element={<PuzzlesPage />} />
        <Route path="/game/play" element={<GamePlay />} />
        <Route path="/game/rules" element={<GameRulesMain />} />
        <Route path="/game/powers-rules" element={<GameRules />} />
        <Route path="/game/common-rules" element={<GameCommonRules />} />
        <Route path="/game/harmony-rules" element={<GameHarmonyRules />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </GameProvider>
  );
}

export default App;
