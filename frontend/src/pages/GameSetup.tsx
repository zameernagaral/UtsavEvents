import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL,fetchTeamSchedule, type ScheduleMatch } from '@/lib/api';
import { ChevronRight, Clock, Trophy, Users, Target, Loader2, Calendar, Sword, Shield, Crown } from 'lucide-react';

export default function GameSetup() {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<{ current_round?: number; matches?: ScheduleMatch[]; all_completed?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const teamName = sessionStorage.getItem('team_name') || localStorage.getItem('team_name');

  useEffect(() => {
    if (!teamName) {
      // Not logged in! Send back to home.
      navigate('/');
      return;
    }

    const loadSchedule = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/teams/${encodeURIComponent(teamName)}/schedule`);
        if (res.ok) {
          const data = await res.json();
          setSchedule(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
    const interval = setInterval(loadSchedule, 5000); // Auto-refresh schedule
    return () => clearInterval(interval);
  }, [teamName, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,128,255,0.03)_0%,transparent_50%)] pointer-events-none" />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <Loader2 size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
            </div>
            <p className="text-xl font-medium text-foreground">Loading Dashboard</p>
            <p className="text-sm text-muted-foreground">Preparing your tournament data...</p>
          </div>
        </main>
      </div>
    );
  }

  const rawPlayer = sessionStorage.getItem('player_number') || localStorage.getItem('player_number');
  const playerNumber = rawPlayer === '1' ? 1 : rawPlayer === '2' ? 2 : null;
  const matches = schedule?.matches ?? [];
  const boardNumbers = Array.from(new Set(matches.map((m) => m.board_number).filter((n) => typeof n === 'number'))) as number[];
  const shouldFilterByBoard = boardNumbers.length > 1 && playerNumber !== null;
  const scopedMatches = shouldFilterByBoard
    ? matches.filter((m) => m.board_number === playerNumber)
    : matches;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,128,255,0.03)_0%,transparent_50%)] pointer-events-none" />
      
      <Header />
      
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Trophy size={16} />
              <span className="text-xs font-semibold tracking-wide">TEAM DASHBOARD</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-2 tracking-tight">
              {teamName}
            </h1>
            <p className="text-lg text-muted-foreground">
              {schedule?.current_round === 0 
                ? 'Qualifier Stage' 
                : schedule?.current_round 
                  ? `Round ${schedule.current_round} of Tournament` 
                  : 'Tournament Dashboard'}
            </p>
          </div>

          {/* Main Content Card */}
          <Card className="border-2 border-border/50 bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
            {/* Colored header bar based on status */}
            <div className={`h-2 w-full bg-gradient-to-r ${
              schedule?.all_completed 
                ? 'from-green-600 to-emerald-400' 
                : scopedMatches.length > 0
                  ? 'from-blue-600 to-purple-400'
                  : 'from-amber-600 to-orange-400'
            }`} />

            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {schedule?.all_completed ? (
                      <>
                        <Crown size={24} className="text-yellow-500" />
                        Tournament Complete
                      </>
                    ) : scopedMatches.length > 0 ? (
                      <>
                        <Sword size={24} className="text-primary" />
                        Active Matches
                      </>
                    ) : (
                      <>
                        <Clock size={24} className="text-amber-500" />
                        Waiting for Matches
                      </>
                    )}
                  </CardTitle>
                </div>
                
                {/* Status badge */}
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  schedule?.all_completed 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : scopedMatches.length > 0
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}>
                  {schedule?.all_completed 
                    ? 'COMPLETED' 
                    : scopedMatches.length > 0
                      ? `${scopedMatches.length} ACTIVE`
                      : 'PENDING'}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {schedule?.all_completed ? (
                // All matches completed state
                <div className="py-12 text-center space-y-4">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-ping opacity-75" />
                    <div className="relative w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <Clock size={40} className="text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Waiting for Next Stage</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Your matches are completed. The next stage will begin shortly.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Auto-refreshing every 5 seconds</span>
                  </div>
                </div>
              ) : scopedMatches.length > 0 ? (
                // Active matches
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Target size={14} />
                    Select a match below to join the game board
                  </p>
                  
                  <div className="grid gap-4">
                    {(() => {
                      const orderByFormat: Record<string, number> = {
                        blitz: 0,
                        rapid: 1,
                        powers: 2,
                        knockout: 3,
                      };
                      const ordered = [...scopedMatches].sort((a: any, b: any) => {
                        const roundA = a.round_number ?? 0;
                        const roundB = b.round_number ?? 0;
                        if (roundA !== roundB) return roundA - roundB;
                        const boardA = a.board_number ?? 0;
                        const boardB = b.board_number ?? 0;
                        if (boardA !== boardB) return boardA - boardB;
                        const formatA = orderByFormat[String(a.format ?? '').toLowerCase()] ?? 99;
                        const formatB = orderByFormat[String(b.format ?? '').toLowerCase()] ?? 99;
                        if (formatA !== formatB) return formatA - formatB;
                        return String(a.game_id).localeCompare(String(b.game_id));
                      });
                      const firstPlayableIndex = ordered.findIndex((m: any) => m.status !== 'completed');

                      return ordered.map((match: any, index: number) => {
                        const lockedByOrder = firstPlayableIndex !== -1 && index > firstPlayableIndex;
                        const isCompleted = match.status === 'completed';
                        const isDisabled = lockedByOrder || isCompleted;
                        return (
                          <Button 
                            key={match.game_id}
                            onClick={() => navigate(`/game/play?gameId=${match.game_id}`)}
                            disabled={isDisabled}
                            className={`relative group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white p-6 h-auto flex flex-col items-start rounded-xl border-2 border-transparent hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl ${isDisabled ? 'cursor-not-allowed opacity-60 hover:from-blue-600 hover:to-blue-500 hover:border-transparent' : ''}`}
                          >
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
                        
                        <div className="relative z-10 w-full">
                          <div className="flex items-center justify-between w-full mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-white/20 rounded-lg">
                                <Sword size={16} className="text-white" />
                              </div>
                              <span className="text-sm font-medium text-white/90">Board {match.board_number}</span>
                            </div>
                            <div className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">
                              {match.variant}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between w-full">
                            <div className="flex-1">
                              <p className="text-xl font-bold mb-1">
                                {match.team_a === teamName ? match.team_b : match.team_a}
                              </p>
                              <p className="text-sm text-white/80 flex items-center gap-1">
                                <Users size={14} />
                                {match.team_a === teamName ? 'VS' : 'VS'} {match.team_a === teamName ? 'Opponent' : 'Opponent'}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-white/80">Your turn?</p>
                                <p className="text-xs text-white/60">Click to play</p>
                              </div>
                              <div className="p-2 bg-white/20 rounded-full group-hover:translate-x-1 transition-transform">
                                <ChevronRight size={20} />
                              </div>
                            </div>
                          </div>
                        </div>
                          </Button>
                        );
                      });
                    })()}
                  </div>

                  {/* Round info */}
                  <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Round {schedule?.current_round ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Auto-refreshes every 5s</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Waiting state
                <div className="py-12 text-center space-y-4">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-ping opacity-75" />
                    <div className="relative w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <Clock size={40} className="text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Waiting for Matches</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      The tournament organizers are generating your next matches. This page will update automatically when they're ready.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Auto-refreshing every 5 seconds</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="mt-6 flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/game')}
              className="border-2 border-border hover:bg-secondary/50 rounded-xl px-6 py-5"
            >
              Back to Formats
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="border-2 border-border hover:bg-secondary/50 rounded-xl px-6 py-5 gap-2"
            >
              <Loader2 size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
