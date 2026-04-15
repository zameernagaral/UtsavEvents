import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  adminLogin,
  advanceEventPhase,
  setEventPhase,
  fetchAdminState,
  type GameFormat,
  type PlayerProfile,
} from '@/lib/api';

const AUTH_KEY = 'admin_auth_password';

const FORMAT_LABELS: Record<GameFormat, string> = {
  blitz: 'Blitz',
  rapid: 'Rapid',
  powers: 'Powers',
  knockout: 'Knockout',
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<GameFormat>('rapid');
  const [currentPhase, setCurrentPhase] = useState('registration');
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const loadState = async (pwd: string) => {
    const state = await fetchAdminState(pwd);
    setCurrentFormat(state.current_format);
    setCurrentPhase(state.current_phase || 'registration');
    setPlayers(state.players);
  };

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    if (!saved) return;

    adminLogin(saved)
      .then((ok) => {
        if (!ok) {
          localStorage.removeItem(AUTH_KEY);
          return;
        }
        setPassword(saved);
        setLoggedIn(true);
        return loadState(saved);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_KEY);
      });
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const interval = window.setInterval(() => {
      loadState(password).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loggedIn, password]);

  const handleLogin = async () => {
    const ok = await adminLogin(password);
    if (!ok) {
      setError('Invalid password');
      return;
    }
    localStorage.setItem(AUTH_KEY, password);
    setLoggedIn(true);
    setError(null);
    await loadState(password);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setLoggedIn(false);
    setPassword('');
  };

  const advancePhase = async () => {
    if (!window.confirm("Are you sure you want to advance the tournament? The backend will calculate eliminations and generate the next schedules automatically.")) return;
    setAdvancing(true);
    setStatus(null);
    setError(null);
    try {
      const result = await advanceEventPhase(password);
      await loadState(password);
      setStatus(result.new_phase ? `Advanced to phase: ${result.new_phase}` : (result.message || 'Phase updated.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not advance phase');
    } finally {
      setAdvancing(false);
    }
  };

  const forcePhase = async (targetPhase: string) => {
    if (!window.confirm(`WARNING: Are you sure you want to force the event to ${targetPhase}?`)) return;
    
    setAdvancing(true);
    setStatus(null);
    setError(null);
    try {
      const result = await setEventPhase(password, targetPhase); 
      await loadState(password);
      setStatus(result.message || `Forced phase to ${targetPhase}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not force phase');
    } finally {
      setAdvancing(false);
    }
  };

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => (b.points - a.points) || (b.wins - a.wins) || a.name.localeCompare(b.name)),
    [players],
  );

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center p-6">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-2xl font-semibold">Admin Panel</h1>
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Enter
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Event Control</h2>
              <p className="text-sm text-slate-600">Match generation and progressions are automated by the backend.</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100">
              Logout
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current Phase</p>
              <p className="mt-1 text-xl font-semibold">{currentPhase}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Registered Teams</p>
              <p className="mt-1 text-xl font-semibold">{players.length}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={advancePhase} disabled={advancing} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6">
              {advancing ? 'Calculating & Advancing...' : 'Advance to Next Phase'}
            </Button>
            
            <div className="ml-auto flex gap-2">
               <select 
                 id="phase-override" 
                 className="rounded border border-slate-300 px-3 py-2 text-sm bg-white"
                 defaultValue=""
                 onChange={(e) => {
                   if (e.target.value) forcePhase(e.target.value);
                   e.target.value = ""; 
                 }}
               >
                 <option value="" disabled>Emergency Force Phase...</option>
                 <option value="registration">Registration</option>
                 <option value="mini_game_1">Mini Game 1</option>
                 <option value="qualifiers">Qualifiers</option>
                 <option value="elimination_cut">Elimination Cut</option>
                 <option value="swiss_stage">Swiss Scheduling</option>
                 <option value="round_robin_top6">Round Robin Scheduling</option>
                 <option value="mini_game_2">Mini Game 2</option>
                 <option value="finals">Finals</option>
                 <option value="completed">Completed</option>
               </select>
            </div>
          </div>
          
          <div className="mt-3">
            {status && <span className="text-sm font-medium text-green-700 bg-green-50 p-2 rounded">{status}</span>}
            {error && <span className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">{error}</span>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Leaderboard Data Check</h2>
            <Button variant="outline" className="border-slate-300 bg-white" onClick={() => setShowLeaderboard((prev) => !prev)}>
              {showLeaderboard ? 'Hide' : 'Show Data'}
            </Button>
          </div>

          {showLeaderboard && (
            <div className="mt-3 space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {sortedPlayers.length === 0 && <p className="text-sm text-slate-500">No teams registered yet.</p>}
              {sortedPlayers.map((player: any) => (
                <div key={player.name} className={`rounded-lg border p-3 ${player.is_eliminated ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">
                      {player.name} 
                      {player.current_group && <span className="ml-2 text-xs font-bold text-blue-600">[{player.current_group.replace('_', ' ')}]</span>}
                      {player.is_eliminated && <span className="ml-2 text-xs font-bold text-red-500">(Eliminated)</span>}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-blue-100 text-blue-800 font-bold px-3 py-1">{player.points} pts</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 grid grid-cols-5 gap-2">
                    <span>Wins: <b>{player.wins}</b></span>
                    <span>Losses: <b>{player.losses}</b></span>
                    <span>Draws: <b>{player.draws}</b></span>
                    <span>Harmony: <b>{player.harmony_tokens}</b></span>
                    <span>Net Time: <b>{player.net_time_diff}s</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


