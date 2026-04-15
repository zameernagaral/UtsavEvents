import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Flame, Sparkles, Swords, Wand2, Zap, Users, ChevronRight, Shield, Trophy, Award, ArrowRight, Gamepad2, Target, Crown } from 'lucide-react';
import { bootstrapPlayer } from '@/lib/api';

export default function GameFormats() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [passcode, setPasscode] = useState('');
  
  // --- UPDATED: Added 'team' to the types ---
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | 'team'>(1);
  // ------------------------------------------

  const [hasIdentity, setHasIdentity] = useState(false);
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedName = sessionStorage.getItem('team_name') ?? '';
    const savedPasscode = sessionStorage.getItem('passcode');
    const savedPlayer = sessionStorage.getItem('player_number');
    if (savedName && savedPasscode) {
      setTeamName(savedName);
      setHasIdentity(true);
    }
    if (savedPlayer === '1') setPlayerNumber(1);
    if (savedPlayer === '2') setPlayerNumber(2);
    if (savedPlayer === 'team') setPlayerNumber('team');
  }, []);

  const saveName = async () => {
    const cleanName = teamName.trim();
    const cleanPasscode = passcode.trim();
    
    if (!cleanName || !cleanPasscode) {
      setError('Team Name and Passcode are required.');
      return;
    }

    setSavingName(true);
    setError(null);
    try {
      // --- UPDATED: Removed isRegistering, defaults to pure login ---
      await bootstrapPlayer(cleanName, cleanPasscode, playerNumber);
      setHasIdentity(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to login');
    } finally {
      setSavingName(false);
    }
  };

  const continueToQueue = async () => {
    if (!hasIdentity) {
      return;
    }
    setJoiningQueue(true);
    setError(null);
    try {
      const savedName = sessionStorage.getItem('team_name') ?? teamName;
      const savedPasscode = sessionStorage.getItem('passcode') ?? '';
      
      // Handle the 'team' string from storage
      const storedPlayerNum = sessionStorage.getItem('player_number') || '1';
      const savedPlayerNum = storedPlayerNum === 'team' ? 'team' : parseInt(storedPlayerNum) as 1 | 2;
      
      await bootstrapPlayer(savedName, savedPasscode, savedPlayerNum);
      navigate('/game/setup');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to join queue');
    } finally {
      setJoiningQueue(false);
    }
  };

  const tmntColors = {
    leo: {
      primary: 'from-blue-600 to-blue-400',
      card: 'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-gray-950',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: 'text-blue-600',
      border: 'border-blue-200 dark:border-blue-800',
      light: 'blue',
    },
    donnie: {
      primary: 'from-purple-600 to-purple-400',
      card: 'border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/80 to-white dark:from-purple-950/30 dark:to-gray-950',
      badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-700 text-white',
      icon: 'text-purple-600',
      border: 'border-purple-200 dark:border-purple-800',
      light: 'purple',
    },
    raph: {
      primary: 'from-red-600 to-red-400',
      card: 'border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50/80 to-white dark:from-red-950/30 dark:to-gray-950',
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600',
      border: 'border-red-200 dark:border-red-800',
      light: 'red',
    },
    mikey: {
      primary: 'from-orange-600 to-orange-400',
      card: 'border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50/80 to-white dark:from-orange-950/30 dark:to-gray-950',
      badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
      icon: 'text-orange-600',
      border: 'border-orange-200 dark:border-orange-800',
      light: 'orange',
    },
  };

  const formats = [
    {
      id: 'blitz',
      name: 'Blitz',
      tagline: 'Lightning Fast',
      description: 'Fast-paced games perfect for quick matches',
      details: 'Normal chess. 5 + 3 time control.',
      icon: Zap,
      features: ['Quick decision making', 'Intense gameplay', 'Perfect for practice'],
      colorSet: 'raph',
      route: '/game/common-rules?format=blitz',
      ruleType: 'common',
    },
    {
      id: 'rapid',
      name: 'Rapid',
      tagline: 'Strategic Depth',
      description: 'Balanced games with thoughtful play',
      details: 'Normal chess. 5 + 3 time control.',
      icon: Clock,
      features: ['Careful planning', 'Deep strategy', 'Classic experience'],
      colorSet: 'donnie',
      route: '/game/common-rules?format=rapid',
      ruleType: 'common',
    },
    {
      id: 'powers',
      name: 'Powers',
      tagline: 'Unique Abilities',
      description: 'Master unique piece abilities and special powers',
      details: 'Modified chess with piece powers. 5 + 3 time control.',
      icon: Wand2,
      features: ['Special abilities', 'Tactical environment', 'Cultural pieces'],
      colorSet: 'mikey',
      route: '/game/powers-rules',
      ruleType: 'powers',
    },
    {
      id: 'knockout',
      name: 'Knockout',
      tagline: 'Token Strategy',
      description: 'Normal chess with Harmony Token pressure',
      details: 'Normal chess with Harmony Tokens. 5 + 0 time control.',
      icon: Flame,
      features: ['Time burning', 'Harmony Tokens', 'Tournament ready'],
      colorSet: 'leo',
      route: '/game/harmony-rules?format=knockout',
      ruleType: 'harmony',
    },
  ] as const;

  const getColor = (set: keyof typeof tmntColors) => tmntColors[set];

  const getBadgeText = (format: (typeof formats)[number]) => {
    switch (format.ruleType) {
      case 'common':
        return 'Learn Rules';
      case 'powers':
        return 'Learn Powers';
      case 'harmony':
        return 'Learn Tokens';
      default:
        return 'Learn Rules';
    }
  };

  if (!hasIdentity) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,128,255,0.03)_0%,transparent_50%)] pointer-events-none" />
        
        <Header />
        <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 relative">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                <Gamepad2 size={16} />
                <span className="text-xs font-semibold tracking-wide">PLAY NOW</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
                CHOOSE<span className="text-primary"> PLAYER</span>
              </h1>
              <p className="text-muted-foreground">
                Select Player 1, Player 2, or Team and enter your passcode
              </p>
            </div>

            <Card className="border-2 border-border/50 shadow-xl rounded-2xl overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-blue-600 to-blue-400" />
              
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users size={22} className="text-primary" />
                  </div>
                  Player Login
                </CardTitle>
                <CardDescription>
                  Enter your team name, passcode, and select who is playing.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      maxLength={40}
                      className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="Enter your team name"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">Passcode</label>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      maxLength={40}
                      className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="Enter secret passcode"
                    />
                  </div>

                  {/* --- UPDATED: 3-way toggle for Player 1, Player 2, or Team --- */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">Who is playing on this device?</label>
                    <div className="flex gap-2">
                      <label className={`flex items-center justify-center gap-2 cursor-pointer px-2 py-2 rounded-lg border transition-colors w-full ${
                        playerNumber === 1 ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/50 border-border hover:bg-secondary'
                      }`}>
                        <input 
                          type="radio" 
                          name="playerNum" 
                          checked={playerNumber === 1}
                          onChange={() => setPlayerNumber(1)} 
                          className="accent-primary w-4 h-4"
                        />
                        <span className="font-medium text-sm">Player 1</span>
                      </label>
                      <label className={`flex items-center justify-center gap-2 cursor-pointer px-2 py-2 rounded-lg border transition-colors w-full ${
                        playerNumber === 2 ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/50 border-border hover:bg-secondary'
                      }`}>
                        <input 
                          type="radio" 
                          name="playerNum" 
                          checked={playerNumber === 2}
                          onChange={() => setPlayerNumber(2)} 
                          className="accent-primary w-4 h-4"
                        />
                        <span className="font-medium text-sm">Player 2</span>
                      </label>
                      <label className={`flex items-center justify-center gap-2 cursor-pointer px-2 py-2 rounded-lg border transition-colors w-full ${
                        playerNumber === 'team' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/50 border-border hover:bg-secondary'
                      }`}>
                        <input 
                          type="radio" 
                          name="playerNum" 
                          checked={playerNumber === 'team'}
                          onChange={() => setPlayerNumber('team')} 
                          className="accent-primary w-4 h-4"
                        />
                        <span className="font-medium text-sm">Team</span>
                      </label>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 flex items-center gap-1 bg-red-500/10 p-2 rounded-lg">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                      {error}
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={saveName} 
                  disabled={!teamName.trim() || !passcode.trim() || savingName} 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 rounded-xl text-lg font-semibold group mt-2"
                >
                  {savingName ? (
                    'Processing...'
                  ) : (
                    <>
                      Login & Continue
                      <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,128,255,0.03)_0%,transparent_50%)] pointer-events-none" />
      
      <Header />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center bg-card border border-border rounded-2xl p-4 mb-12 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Playing as</p>
                <p className="font-bold text-foreground">{teamName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Ready to play
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Log Out
              </Button>
            </div>
          </div>

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles size={16} />
              <span className="text-xs font-semibold tracking-wide">CHOOSE YOUR BATTLE</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-black text-foreground mb-4 tracking-tight">
              GAME<span className="text-primary"> FORMATS</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select your preferred format, learn the rules, and join the queue when ready
            </p>

            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {[
                { icon: Zap, label: '4 Formats' },
                { icon: Clock, label: 'Multiple Time Controls' },
                { icon: Trophy, label: 'Tournament Ready' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="flex items-center gap-2 bg-secondary/50 border border-border px-4 py-2 rounded-full">
                    <Icon size={14} className="text-primary" />
                    <span className="text-sm font-medium">{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {formats.map((format) => {
              const color = getColor(format.colorSet);
              const Icon = format.icon;
              const badgeText = getBadgeText(format);

              return (
                <div key={format.id} className="relative group">
                  <Card className={`relative border-2 ${color.border} ${color.card} rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                    <div className={`h-2 w-full bg-gradient-to-r ${color.primary}`} />

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={`inline-flex items-center gap-1 ${color.badge} text-xs font-bold px-3 py-1 rounded-full mb-3`}>
                            <Award size={12} />
                            {format.tagline}
                          </div>
                          <CardTitle className="text-3xl font-bold text-foreground">{format.name}</CardTitle>
                        </div>
                        <div className={`w-14 h-14 ${color.badge} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon size={28} className={color.icon} />
                        </div>
                      </div>
                      <CardDescription className="text-base text-muted-foreground">
                        {format.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock size={14} className="text-primary" />
                          {format.details}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Features</p>
                        {format.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className={`w-1.5 h-1.5 rounded-full ${color.icon}`} />
                            {feature}
                          </div>
                        ))}
                      </div>

                      <Link to={format.route} className="block">
                        <Button className={`w-full ${color.button} font-semibold py-6 rounded-xl gap-2 group/btn`}>
                          <Swords size={18} className="group-hover/btn:rotate-12 transition-transform" />
                          {badgeText}
                          <ArrowRight size={16} className="ml-auto group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent rounded-2xl shadow-lg overflow-hidden">
              <div className="p-1 bg-gradient-to-r from-primary via-purple-500 to-primary" />
              
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Crown size={24} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Ready to compete?</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Target size={12} />
                        Join the queue and test your skills
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {error && (
                      <p className="text-sm text-red-600 order-2 sm:order-1">{error}</p>
                    )}
                    <Button 
                      onClick={continueToQueue} 
                      disabled={joiningQueue} 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg rounded-xl w-full sm:w-auto group order-1 sm:order-2"
                    >
                      {joiningQueue ? (
                        'Joining...'
                      ) : (
                        <>
                          Join Queue
                          <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
