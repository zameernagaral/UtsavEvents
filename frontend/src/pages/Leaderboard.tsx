import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/header';
import { fetchLeaderboard, type PlayerProfile } from '@/lib/api';
import { Trophy, Crown, Medal, Users, TrendingUp, Clock, Heart, Shield, Sparkles } from 'lucide-react';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchLeaderboard();
      setPlayers(data);
      setError(null);
    } catch {
      setError('Unable to load leaderboard.');
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    const id = window.setInterval(() => {
      load().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  // Sort logic (Points -> Net Time Diff -> Harmony -> Name)
  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.net_time_diff !== a.net_time_diff) return b.net_time_diff - a.net_time_diff;
      if (b.harmony_tokens !== a.harmony_tokens) return b.harmony_tokens - a.harmony_tokens;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [players]);

  // Group teams by their `current_group` attribute
  const groupedPlayers = useMemo(() => {
    const groups: Record<string, PlayerProfile[]> = {};
    let hasGroups = false;

    sorted.forEach(p => {
      if (p.current_group && p.current_group !== "none") {
        hasGroups = true;
        if (!groups[p.current_group]) groups[p.current_group] = [];
        groups[p.current_group].push(p);
      }
    });

    return hasGroups ? groups : null;
  }, [sorted]);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown size={16} color="#3b82f6" />;
    if (rank === 1) return <Medal size={16} color="#60a5fa" />;
    if (rank === 2) return <Medal size={16} color="#93c5fd" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 0) return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold">🥇 1st</span>;
    if (rank === 1) return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">🥈 2nd</span>;
    if (rank === 2) return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">🥉 3rd</span>;
    return <span className="text-blue-300 text-xs">#{rank + 1}</span>;
  };

  const renderTable = (data: PlayerProfile[], title?: string) => (
    <div className="mb-8" key={title || 'global'}>
      {title && (
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-1 bg-blue-500 rounded-full" />
          <h2 className="text-xl font-bold text-blue-800 capitalize">
            {title.replace('_', ' ')} Group
          </h2>
          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <Users size={12} />
            <span>{data.length} teams</span>
          </div>
        </div>
      )}
      
      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Team Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Points</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">W-L-D</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Net Time</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Harmony</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-blue-400 text-center" colSpan={7}>
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-blue-200" />
                      <span>No teams assigned yet.</span>
                    </div>
                  </td>
                </tr>
              )}
              {data.map((p, idx) => (
                <tr 
                  key={p.id} 
                  className={`border-t border-blue-100 transition-colors hover:bg-blue-50/50 ${
                    p.is_eliminated ? 'bg-red-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-semibold">
                    <div className="flex items-center gap-2">
                      {getRankIcon(idx)}
                      {getRankBadge(idx)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-900">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {p.name?.charAt(0) || '?'}
                      </div>
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-blue-600 text-lg">{p.points}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className="text-blue-600 font-semibold">{p.wins}</span>
                    <span className="text-blue-300 mx-1">-</span>
                    <span className="text-blue-500 font-semibold">{p.losses}</span>
                    <span className="text-blue-300 mx-1">-</span>
                    <span className="text-blue-600 font-semibold">{p.draws}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <div className="flex items-center justify-end gap-1">
                      <Clock size={12} className="text-blue-400" />
                      <span className={p.net_time_diff < 0 ? 'text-blue-500' : 'text-blue-600'}>
                        {p.net_time_diff > 0 ? '+' : ''}{p.net_time_diff.toFixed(1)}s
                      </span>
                    </div>
                   </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Heart size={12} className="text-blue-500" />
                      <span className="font-semibold text-blue-600">{p.harmony_tokens}</span>
                    </div>
                   </td>
                  <td className="px-4 py-3 text-right">
                    {p.is_eliminated ? (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
                        <Shield size={10} /> Eliminated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                        <Sparkles size={10} /> Active
                      </span>
                    )}
                   </td>
                </tr>
              ))}
            </tbody>
           </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <Header />
      <main className="mx-auto max-w-6xl p-6">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full mb-4">
            <Trophy size={18} className="text-blue-600" />
            <span className="text-blue-700 font-semibold text-sm">Live Rankings</span>
          </div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Leaderboard
          </h1>
          <p className="text-blue-500 max-w-2xl mx-auto">
            Rankings based on Points, followed by Net Time Difference, then Harmony Tokens.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-500 text-sm">Total Teams</p>
                <p className="text-2xl font-bold text-blue-800">{players.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-500 text-sm">Active Teams</p>
                <p className="text-2xl font-bold text-blue-600">{players.filter(p => !p.is_eliminated).length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Sparkles size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-500 text-sm">Top Score</p>
                <p className="text-2xl font-bold text-blue-600">{Math.max(...players.map(p => p.points), 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Crown size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-500 text-sm">Avg. Harmony</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(players.reduce((acc, p) => acc + p.harmony_tokens, 0) / players.length || 0).toFixed(1)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Heart size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        {/* Conditional Rendering: Either show multiple Group tables, or one Global table */}
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-blue-800">Championship Standings</h2>
                <p className="text-sm text-blue-500">Updated live every 5 seconds</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            {groupedPlayers 
              ? Object.entries(groupedPlayers)
                  .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                  .map(([groupName, groupData]) => renderTable(groupData, groupName))
              : renderTable(sorted)
            }
          </div>
        </div>
      </main>
    </div>
  );
}