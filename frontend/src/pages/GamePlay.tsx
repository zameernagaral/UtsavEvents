import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Flag, RotateCcw, Settings, Users } from 'lucide-react';

import { Header } from '@/components/header';
import { InteractiveChessBoard } from '@/components/interactive-chess-board';
import { GameErrorBoundary } from '@/components/game-error-boundary';
import { MoveHistory } from '@/components/move-history';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/game-context';
import {
  WS_BASE_URL,
  fetchGameState,
  fetchLeaderboard,
  fetchRoundState,
  fetchTeamSchedule,
  submitGameResult,
  type PlayerProfile,
  type ScheduleMatch,
} from '@/lib/api';

type Format = 'blitz' | 'rapid' | 'powers' | 'knockout';

interface SavedPlayer {
  id: string;
  name: string;
  passcode: string;
}

interface PairMessage {
  type: 'paired';
  player_id: string;
  player_color: 'w' | 'b';
  session: {
    id: string;
    format: Format;
    variant: string;
    team_a: string;
    team_b: string;
    white_player_name: string;
    black_player_name: string;
    white_time: number;
    black_time: number;
    white_harmony_tokens: number;
    black_harmony_tokens: number;
    increment: number;
    used_powers: {
      white: { convert: boolean; leap: boolean; trade: boolean; resurrection: boolean };
      black: { convert: boolean; leap: boolean; trade: boolean; resurrection: boolean };
    };
    fen: string;
  };
}

const RULES_BY_FORMAT: Record<Format, string[]> = {
  blitz: ['Normal chess', 'Fast tactical play'],
  rapid: ['Normal chess', 'Balanced strategy'],
  powers: ['Modified chess', 'Monk Convert (once)', 'Warrior Leap (once)', 'Merchant Trade (once)', 'Keeper Resurrection (once)'],
  knockout: ['Normal chess', 'Harmony Tokens active', 'Each player max 3 harmony tokens'],
};

const DEFAULT_USED_POWERS = {
  white: { convert: false, leap: false, trade: false, resurrection: false },
  black: { convert: false, leap: false, trade: false, resurrection: false },
};

function buildPair(match: ScheduleMatch, playerId: string): PairMessage {
  return {
    type: 'paired',
    player_id: playerId,
    player_color: match.team_a === playerId ? 'w' : 'b',
    session: {
      id: match.game_id,
      format: match.format,
      variant: match.variant,
      team_a: match.team_a,
      team_b: match.team_b,
      white_player_name: match.team_a,
      black_player_name: match.team_b,
      white_time: match.time_seconds,
      black_time: match.time_seconds,
      white_harmony_tokens: 3,
      black_harmony_tokens: 3,
      increment: match.increment_seconds,
      used_powers: DEFAULT_USED_POWERS,
      fen: 'start',
    },
  };
}

export default function GamePlay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameIdFromUrl = searchParams.get('gameId');

  const { gameState, applyRemoteEvent, initializeOnlineGame, resetGame, setNetworkEventHandler, startGame, surrender } = useGame();

  const gameSocketRef = useRef<WebSocket | null>(null);
  const pendingNetworkPayloadsRef = useRef<string[]>([]);
  const nextRoundNavLockRef = useRef(false);
  const applyRemoteEventRef = useRef(applyRemoteEvent);
  const activeMatchRef = useRef<{ gameId: string; teamA: string; teamB: string } | null>(null);
  const playerRef = useRef<SavedPlayer | null>(null);
  const lastMoveCountRef = useRef(0);
  const lastFenRef = useRef('start');
  const resultSubmittedRef = useRef(false);
  const gameStateRef = useRef(gameState);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);
  const schedulePollRef = useRef<number | null>(null);
  const pendingMatchRef = useRef<ScheduleMatch | null>(null);
  const awaitingOpponentRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);
  const [waitingMessage, setWaitingMessage] = useState('Connecting to game server...');
  const [pendingPair, setPendingPair] = useState<PairMessage | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerProfile[]>([]);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultSummary, setResultSummary] = useState('');

  const format = gameState.format;

  const formatColors = useMemo(() => ({ blitz: 'from-red-600 to-red-400', rapid: 'from-purple-600 to-purple-400', powers: 'from-orange-600 to-orange-400', knockout: 'from-blue-600 to-blue-400' }), []);
  const formatTextColors = useMemo(() => ({ blitz: 'text-red-600', rapid: 'text-purple-600', powers: 'text-orange-600', knockout: 'text-blue-600' }), []);
  const formatNames = useMemo(() => ({ blitz: 'Blitz', rapid: 'Rapid', powers: 'Powers', knockout: 'Knockout' }), []);

  const getStoredPlayerNumber = () => {
    const raw = sessionStorage.getItem('player_number') || localStorage.getItem('player_number');
    if (raw === '1') return 1;
    if (raw === '2') return 2;
    if (raw === 'team') return 'team';
    return null;
  };

  const loadRoundState = async () => {
    try {
      const state = await fetchRoundState();
      setLeaderboard(state.leaderboard);
    } catch {
      // ignore temporary network errors
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const clearHeartbeat = () => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const clearSchedulePoll = () => {
    if (schedulePollRef.current) {
      window.clearInterval(schedulePollRef.current);
      schedulePollRef.current = null;
    }
  };

  const activatePendingMatch = () => {
    if (!awaitingOpponentRef.current) return;
    const match = pendingMatchRef.current;
    const player = playerRef.current;
    if (!match || !player) return;
    awaitingOpponentRef.current = false;
    clearSchedulePoll();
    setPendingPair(buildPair(match, player.id));
    setIsWaiting(false);
  };

  const scheduleReconnect = () => {
    if (!shouldReconnectRef.current) return;
    if (reconnectTimerRef.current) return;
    const attempt = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempt;
    const delay = Math.min(10000, 500 * 2 ** (attempt - 1));
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      const active = activeMatchRef.current;
      const player = playerRef.current;
      if (active && player && !gameStateRef.current.gameOver && shouldReconnectRef.current) {
        openGameSocket(active.gameId, player);
      }
    }, delay);
  };

  const sendStateSyncSnapshot = (socket: WebSocket) => {
    const active = activeMatchRef.current;
    if (!active) return;
    const snapshot = gameStateRef.current;
    try {
      socket.send(
        JSON.stringify({
          type: 'state_sync',
          state: {
            fen: snapshot.boardHistory?.[snapshot.boardHistory.length - 1] ?? 'start',
            current_turn: snapshot.currentTurn,
            white_time: snapshot.whiteTime,
            black_time: snapshot.blackTime,
            white_harmony_tokens: snapshot.whiteHarmonyTokens,
            black_harmony_tokens: snapshot.blackHarmonyTokens,
            used_powers: snapshot.usedPowers,
            moves: snapshot.moves,
          },
          game_id: active.gameId,
          team_a: active.teamA,
          team_b: active.teamB,
        }),
      );
    } catch {
      // ignore snapshot failures
    }
  };

  const updateSyncRefs = (fen?: string, moveCount?: number) => {
    if (typeof fen === 'string' && fen) {
      lastFenRef.current = fen;
    }
    if (typeof moveCount === 'number' && Number.isFinite(moveCount)) {
      lastMoveCountRef.current = moveCount;
    }
  };

  const openGameSocket = (gameId: string, player: SavedPlayer) => {
    gameSocketRef.current?.close();
    clearReconnectTimer();
    clearHeartbeat();
    const gameSocket = new WebSocket(
      `${WS_BASE_URL}/ws/game/${encodeURIComponent(gameId)}?team_name=${encodeURIComponent(player.id)}&passcode=${encodeURIComponent(player.passcode)}`,
    );
    gameSocketRef.current = gameSocket;

    gameSocket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      const pending = pendingNetworkPayloadsRef.current;
      if (pending.length > 0) {
        pending.forEach((payload) => {
          try {
            gameSocket.send(payload);
          } catch {
            // If send fails, keep going; we do not want to crash the UI.
          }
        });
      }
      pendingNetworkPayloadsRef.current = [];

      try {
        gameSocket.send(JSON.stringify({ type: 'state_sync_request' }));
      } catch {
        // ignore request failures
      }
      sendStateSyncSnapshot(gameSocket);

      clearHeartbeat();
      heartbeatRef.current = window.setInterval(() => {
        if (gameSocket.readyState !== WebSocket.OPEN) return;
        try {
          gameSocket.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore keepalive errors
        }
      }, 8000);
    };

    gameSocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as any;
        if (!payload) return;

        if (payload.type === 'ping') {
          try {
            gameSocket.send(JSON.stringify({ type: 'pong' }));
          } catch {
            // ignore pong failures
          }
          return;
        }

        if (payload.type === 'pong') return;

        if (payload.type === 'state_sync_request') {
          activatePendingMatch();
          sendStateSyncSnapshot(gameSocket);
          return;
        }

        if (payload.type === 'game_over') {
          activatePendingMatch();
          const active = activeMatchRef.current;
          if (!active) return;
          const winner = typeof payload.winner === 'string' ? payload.winner : null;
          const winnerColor = winner === null ? null : winner === active.teamA ? 'w' : 'b';
          applyRemoteEventRef.current({ type: 'game_over', winner_color: winnerColor, is_draw: winner === null });
          return;
        }

        if (payload.type === 'move') {
          activatePendingMatch();
          applyRemoteEventRef.current(payload);
          updateSyncRefs(payload.fen_string, payload.move_count);
          return;
        }

        if (payload.type === 'state_sync' && payload.state) {
          activatePendingMatch();
          applyRemoteEventRef.current(payload);
          updateSyncRefs(payload.state?.fen, Array.isArray(payload.state?.moves) ? payload.state.moves.length : undefined);
          return;
        }

        if (payload.type === 'clock_drain') {
          activatePendingMatch();
          applyRemoteEventRef.current({
            type: 'state_sync',
            state: {
              white_time: payload.team_a_time,
              black_time: payload.team_b_time,
              white_harmony_tokens: payload.white_harmony_tokens,
              black_harmony_tokens: payload.black_harmony_tokens,
              current_turn: payload.state?.current_turn,
            },
          });
          return;
        }

        if (typeof payload.fen_string === 'string') {
          activatePendingMatch();
          applyRemoteEventRef.current({
            type: 'state_sync',
            state: {
              fen: payload.fen_string,
              current_turn: payload.state?.current_turn,
              white_time: payload.team_a_time,
              black_time: payload.team_b_time,
              used_powers: payload.state?.used_powers,
              moves: payload.state?.moves,
            },
          });
          updateSyncRefs(payload.fen_string, payload.move_count);
        }
      } catch {
        // ignore malformed payloads to keep game stable
      }
    };

    gameSocket.onerror = () => {
      clearHeartbeat();
      if (shouldReconnectRef.current && !gameStateRef.current.gameOver) {
        scheduleReconnect();
      }
    };

    gameSocket.onclose = () => {
      clearHeartbeat();
      if (shouldReconnectRef.current && !gameStateRef.current.gameOver) {
        scheduleReconnect();
      }
    };
  };

  useEffect(() => {
    applyRemoteEventRef.current = applyRemoteEvent;
  }, [applyRemoteEvent]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    setMounted(true);
    loadRoundState().catch(() => undefined);
    shouldReconnectRef.current = true;

    const init = async () => {
      const teamName = localStorage.getItem('team_name');
      const passcode = localStorage.getItem('passcode');
      const sessionTeam = sessionStorage.getItem('team_name') || teamName;
      const sessionPass = sessionStorage.getItem('passcode') || passcode;

      // If they aren't logged in, or didn't click a specific game URL, kick them to dashboard
      if (!sessionTeam || !sessionPass || !gameIdFromUrl) {
        navigate('/game/setup');
        return;
      }

      const player = { id: sessionTeam, name: sessionTeam, passcode: sessionPass };
      playerRef.current = player;
      resultSubmittedRef.current = false;
      nextRoundNavLockRef.current = false;
      setShowResultDialog(false);
      setResultSummary('');
      setPendingPair(null);
      resetGame();
      
      gameSocketRef.current?.close();
      clearSchedulePoll();

      // Fetch their specific schedule to validate the game they clicked
      const matches = await fetchTeamSchedule(player.id).catch(() => []);
      const activeMatch = matches.find((m) => m.game_id === gameIdFromUrl);

      if (!activeMatch) {
        setWaitingMessage("Game not found or already completed.");
        setTimeout(() => navigate('/game/setup'), 2000);
        return;
      }

      if (activeMatch.status === 'completed') {
        setWaitingMessage("Game already completed.");
        setTimeout(() => navigate('/game/setup'), 2000);
        return;
      }

      if (activeMatch.status === 'pending') {
        setWaitingMessage('Waiting for opponent to join...');
        setIsWaiting(true);
        pendingMatchRef.current = activeMatch;
        awaitingOpponentRef.current = true;
        activeMatchRef.current = { gameId: activeMatch.game_id, teamA: activeMatch.team_a, teamB: activeMatch.team_b };
        openGameSocket(activeMatch.game_id, player);
        schedulePollRef.current = window.setInterval(async () => {
          const updated = await fetchTeamSchedule(player.id).catch(() => []);
          const refreshed = updated.find((m) => m.game_id === gameIdFromUrl);
          if (!refreshed) {
            clearSchedulePoll();
            setWaitingMessage('Game not found or already completed.');
            setTimeout(() => navigate('/game/setup'), 2000);
            return;
          }
          if (refreshed.status === 'completed') {
            clearSchedulePoll();
            setWaitingMessage('Game already completed.');
            setTimeout(() => navigate('/game/setup'), 2000);
            return;
          }
          if (refreshed.status === 'ongoing') {
            clearSchedulePoll();
            setPendingPair(buildPair(refreshed, player.id));
            setIsWaiting(false);
          }
        }, 5000);
        return;
      }

      setPendingPair(buildPair(activeMatch, player.id));
      setIsWaiting(false);
    };

    init().catch(() => {
      setWaitingMessage('Unable to connect to backend.');
    });

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      clearHeartbeat();
      clearSchedulePoll();
      gameSocketRef.current?.close();
    };
  }, [navigate, gameIdFromUrl, resetGame]);

  useEffect(() => {
    setNetworkEventHandler((networkEvent) => {
      const socket = gameSocketRef.current;
      const active = activeMatchRef.current;
      const snapshot = gameStateRef.current;
      if (!socket || !active) return;

      if (networkEvent.type === 'move') {
        const moveCount = typeof networkEvent.move_count === 'number' ? networkEvent.move_count : snapshot.moves.length;
        const whiteTime = typeof networkEvent.team_a_time === 'number' ? networkEvent.team_a_time : snapshot.whiteTime;
        const blackTime = typeof networkEvent.team_b_time === 'number' ? networkEvent.team_b_time : snapshot.blackTime;
        const fen = typeof networkEvent.fen_string === 'string' && networkEvent.fen_string ? networkEvent.fen_string : lastFenRef.current;

        const payload = JSON.stringify({
          ...networkEvent,
          game_id: active.gameId,
          team_a: active.teamA,
          team_b: active.teamB,
          team_a_time: whiteTime,
          team_b_time: blackTime,
          move_count: moveCount,
          fen_string: fen,
          game_status: snapshot.gameOver ? 'completed' : 'ongoing',
        });

        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        } else {
          pendingNetworkPayloadsRef.current.push(payload);
        }

        lastMoveCountRef.current = moveCount;
        lastFenRef.current = fen;
        return;
      }

      if (networkEvent.type === 'clock_drain') {
        const payload = JSON.stringify({
          ...networkEvent,
          game_id: active.gameId,
          team_a: active.teamA,
          team_b: active.teamB,
        });

        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        } else {
          pendingNetworkPayloadsRef.current.push(payload);
        }
        return;
      }

      if (networkEvent.type === 'state_sync') {
        const state = networkEvent.state ?? {};
        const moveCount = Array.isArray(state.moves) ? state.moves.length : snapshot.moves.length;
        const whiteTime = typeof state.white_time === 'number' ? state.white_time : snapshot.whiteTime;
        const blackTime = typeof state.black_time === 'number' ? state.black_time : snapshot.blackTime;
        const fen = typeof state.fen === 'string' && state.fen ? state.fen : lastFenRef.current;
        const forceClock = networkEvent.sync_kind === 'clock';
        const isMoveUpdate = !forceClock && (moveCount !== lastMoveCountRef.current || fen !== lastFenRef.current);

        const payload: Record<string, unknown> = {
          type: isMoveUpdate ? 'move' : 'clock_drain',
          state: { ...state, fen, white_time: whiteTime, black_time: blackTime },
          game_id: active.gameId,
          team_a: active.teamA,
          team_b: active.teamB,
          team_a_time: whiteTime,
          team_b_time: blackTime,
          move_count: moveCount,
          fen_string: fen,
          game_status: snapshot.gameOver ? 'completed' : 'ongoing',
        };

        const serialized = JSON.stringify(payload);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(serialized);
        } else {
          pendingNetworkPayloadsRef.current.push(serialized);
        }

        if (isMoveUpdate) {
          lastMoveCountRef.current = moveCount;
          lastFenRef.current = fen;
        }
        return;
      }

      if (networkEvent.type === 'game_over') {
        const winnerTeam = networkEvent.is_draw || networkEvent.winner_color === null
          ? null
          : networkEvent.winner_color === 'w' ? active.teamA : active.teamB;

        const payload = JSON.stringify({ type: 'game_over', game_id: active.gameId, winner: winnerTeam, game_status: 'completed' });
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        } else {
          pendingNetworkPayloadsRef.current.push(payload);
        }
      }
    });

    return () => {
      setNetworkEventHandler(null);
    };
  }, [setNetworkEventHandler]);

  useEffect(() => {
    if (!gameState.onlineMatch || !gameState.gameOver || resultSubmittedRef.current) return;

    const active = activeMatchRef.current;
    const player = playerRef.current;
    if (!active || !player) return;

    // Team A (white) reports once to avoid duplicate score updates.
    if (gameState.localPlayerColor !== 'w') return;

    resultSubmittedRef.current = true;
    const resultText = gameState.result.toLowerCase();
    const isDraw = resultText.includes('draw') || resultText.includes('stalemate');
    const winnerTeam = isDraw ? null : resultText.includes('white wins') ? active.teamA : resultText.includes('black wins') ? active.teamB : null;

    const isHarmonyGame = gameState.format === 'powers';
    submitGameResult({
      game_id: active.gameId,
      team_a: active.teamA,
      team_b: active.teamB,
      winner_team: winnerTeam,
      team_a_time_left: gameState.whiteTime,
      team_b_time_left: gameState.blackTime,
      is_draw: isDraw,
      submitter_team: active.teamA,
      passcode: player.passcode,
      harmony: isHarmonyGame,
    }).catch(() => undefined);
  }, [gameState.blackTime, gameState.format, gameState.gameOver, gameState.localPlayerColor, gameState.onlineMatch, gameState.result, gameState.whiteTime]);

  useEffect(() => {
    if (!gameState.gameOver || nextRoundNavLockRef.current) return;
    if (!gameState.onlineMatch || !gameState.gameStarted) return;
    if (gameState.sessionId && gameIdFromUrl && gameState.sessionId !== gameIdFromUrl) return;
    nextRoundNavLockRef.current = true;
    setResultSummary(gameState.result || 'Game over.');
    setShowResultDialog(true);
  }, [gameState.gameOver, gameState.result, gameState.gameStarted, gameState.onlineMatch, gameState.sessionId, gameIdFromUrl]);

  const startFromRules = async () => {
    if (!pendingPair) return;

    const player = playerRef.current;
    if (!player) {
      navigate('/game/setup');
      return;
    }

    const session = pendingPair.session;
    let fen = session.fen;
    let whiteTime = session.white_time;
    let blackTime = session.black_time;
    let moveCount = 0;
    let whiteHarmonyTokens = session.white_harmony_tokens;
    let blackHarmonyTokens = session.black_harmony_tokens;

    try {
      const restored = await fetchGameState(session.id);
      if (restored.status === 'restored') {
        fen = restored.current_fen || fen;
        whiteTime = restored.team_a_time ?? whiteTime;
        blackTime = restored.team_b_time ?? blackTime;
        moveCount = restored.move_count ?? 0;
      }
    } catch {
      // use default fresh board if restore endpoint is unavailable
    }

    try {
      const playerNumber = getStoredPlayerNumber();
      let leaderboardSnapshot = leaderboard;
      if (!leaderboardSnapshot || leaderboardSnapshot.length === 0) {
        leaderboardSnapshot = await fetchLeaderboard();
      }
      const teamAEntry = leaderboardSnapshot.find((p) => p.name === session.team_a || p.id === session.team_a);
      const teamBEntry = leaderboardSnapshot.find((p) => p.name === session.team_b || p.id === session.team_b);

      if (playerNumber === 1 || playerNumber === 2) {
        const key = playerNumber === 1 ? 'player_1_harmony' : 'player_2_harmony';
        whiteHarmonyTokens = teamAEntry ? (teamAEntry as any)[key] ?? whiteHarmonyTokens : whiteHarmonyTokens;
        blackHarmonyTokens = teamBEntry ? (teamBEntry as any)[key] ?? blackHarmonyTokens : blackHarmonyTokens;
      } else if (playerNumber === 'team') {
        whiteHarmonyTokens = teamAEntry?.harmony_tokens ?? whiteHarmonyTokens;
        blackHarmonyTokens = teamBEntry?.harmony_tokens ?? blackHarmonyTokens;
      }
    } catch {
      // fallback to defaults when leaderboard fetch fails
    }

    initializeOnlineGame({
      format: session.format,
      whitePlayer: session.white_player_name,
      blackPlayer: session.black_player_name,
      localPlayerColor: pendingPair.player_color,
      localPlayerId: pendingPair.player_id,
      sessionId: session.id,
      whiteTime,
      blackTime,
      increment: session.increment,
      whiteHarmonyTokens,
      blackHarmonyTokens,
      usedPowers: session.used_powers,
      fen,
    });

    startGame();
    setPendingPair(null);
    setIsWaiting(false);
    activeMatchRef.current = { gameId: session.id, teamA: session.team_a, teamB: session.team_b };
    lastMoveCountRef.current = moveCount;
    lastFenRef.current = fen;

    openGameSocket(session.id, player);
  };

  const handleReset = () => {
    if (gameState.onlineMatch && !gameState.gameOver && gameState.localPlayerColor) {
      surrender(gameState.localPlayerColor, true);
    }
    activeMatchRef.current = null;
    resetGame();
    navigate('/game/setup');
  };

  const handleSurrender = () => {
    if (window.confirm('Are you sure you want to surrender?')) {
      surrender(gameState.localPlayerColor ?? gameState.currentTurn);
    }
  };

  const handleResultContinue = () => {
    setShowResultDialog(false);
    activeMatchRef.current = null;
    // Always route back to the dashboard so they can join their next game
    navigate('/game/setup', { replace: true });
  };

  if (!mounted) return null;

  if (isWaiting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
        <Header />
        <main className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center p-6">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-900 shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold">Connecting...</h1>
            <p className="text-sm text-slate-600">{waitingMessage}</p>
          </div>
        </main>
      </div>
    );
  }

  if (pendingPair) {
    const formatKey = pendingPair.session.format;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
        <Header />
        <main className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold">Match Ready</h1>
            <p className="mb-4 text-sm text-slate-600">
              {pendingPair.session.white_player_name} vs {pendingPair.session.black_player_name} - {formatNames[formatKey]}
            </p>
            <h2 className="mb-2 text-lg font-semibold">Game Rules</h2>
            <p className="mb-2 text-sm text-slate-600">Clock: {Math.floor(pendingPair.session.white_time / 60)} minutes with +{pendingPair.session.increment}s increment</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {RULES_BY_FORMAT[formatKey].map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <Button className="bg-blue-600 px-7 text-white hover:bg-blue-700" onClick={startFromRules}>
                I Understand, Start Game
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const accentColor = formatColors[format];
  const textColor = formatTextColors[format];
  const formatName = formatNames[format];
  const isBlackPerspective = gameState.onlineMatch && gameState.localPlayerColor === 'b';
  const topColor: 'w' | 'b' = isBlackPerspective ? 'w' : 'b';
  const bottomColor: 'w' | 'b' = isBlackPerspective ? 'b' : 'w';
  const topPlayerName = topColor === 'w' ? gameState.whitePlayer : gameState.blackPlayer;
  const bottomPlayerName = bottomColor === 'w' ? gameState.whitePlayer : gameState.blackPlayer;
  const topTime = topColor === 'w' ? gameState.whiteTime : gameState.blackTime;
  const bottomTime = bottomColor === 'w' ? gameState.whiteTime : gameState.blackTime;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <Header />
      <main className="flex-1 flex justify-center p-4 md:p-6">
        <div className="flex w-full max-w-[1850px] flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-3 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex items-center gap-3 justify-self-start">
                <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r px-3 py-1.5 text-white shadow-md ${accentColor}`}>
                  <span className="text-sm font-semibold">{formatName}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  <div className={`h-2 w-2 rounded-full ${gameState.currentTurn === 'w' ? 'bg-green-500' : 'bg-slate-400'}`} />
                  <span className="text-xs font-medium text-slate-700">{gameState.currentTurn === 'w' ? 'White to move' : 'Black to move'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-self-end">
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full border border-slate-200 bg-white p-0" onClick={() => setShowSettings(!showSettings)}>
                  <Settings size={14} className="text-slate-600" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs" onClick={() => navigate('/game/setup')}>
                  <ChevronLeft className="mr-1 h-3 w-3" />
                  <span>Dashboard</span>
                </Button>
              </div>
            </div>

            <div className="w-full overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 justify-self-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-700">{(topPlayerName || '?').charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold">{topPlayerName}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Users size={12} />{topColor === 'w' ? 'White' : 'Black'}</p>
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-500">{topColor === 'w' ? 'White' : 'Black'}</div>
              </div>
            </div>

            <div className="w-full border-x border-slate-200 bg-white shadow-sm">
              <div className="flex w-full justify-center p-1">
                <GameErrorBoundary><InteractiveChessBoard /></GameErrorBoundary>
              </div>
            </div>

            <div className="w-full overflow-hidden rounded-b-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 justify-self-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100 text-sm text-slate-700">{(bottomPlayerName || '?').charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold">{bottomPlayerName}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Users size={12} />{bottomColor === 'w' ? 'White' : 'Black'}</p>
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-500">{bottomColor === 'w' ? 'White' : 'Black'}</div>
              </div>
            </div>

            <div className="mt-3 flex w-full items-center justify-between">
              <div className="flex items-center gap-3 justify-self-end">
                <Button onClick={handleSurrender} variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" disabled={gameState.gameOver}>
                  <Flag size={12} className="mr-1" />
                  <span>Surrender</span>
                </Button>
              </div>

              {gameState.gameOver && <div className={`rounded-full bg-gradient-to-r px-4 py-2 text-sm font-semibold text-white shadow-sm ${accentColor}`}>{gameState.result}</div>}
            </div>

            {gameState.gameOver && (
              <div className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-3">
                <h3 className="text-sm font-semibold text-slate-800">Leaderboard</h3>
                <div className="mt-2 max-h-44 overflow-auto text-sm">
                  {leaderboard.length === 0 && <p className="text-xs text-slate-500">No results yet.</p>}
                  {leaderboard.slice(0, 10).map((p, index) => (
                    <div key={p.id} className="flex items-center justify-between py-1">
                      <span>{index + 1}. {p.name}</span>
                      <span className="font-semibold">{p.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 lg:w-80">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className={`h-1 w-full bg-gradient-to-r ${accentColor}`} />
              <div className="flex items-center justify-between border-b p-3">
                <h3 className={`text-sm font-semibold ${textColor}`}>Move History</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{gameState.moves.length} moves</span>
              </div>
              <div className="h-[400px] overflow-auto p-2">
                <MoveHistory />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b p-3">
                <h3 className={`text-sm font-semibold ${textColor}`}>Game Clock</h3>
              </div>
              <div className="space-y-3 p-4">
                <div className={`rounded-lg border px-3 py-3 ${gameState.currentTurn === topColor ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-sm font-semibold text-slate-700 truncate">{topPlayerName}</p>
                  <p className="mt-1 text-6xl font-semibold tracking-tight">
                    {Math.floor(topTime / 60).toString().padStart(2, '0')}:{(topTime % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div className={`rounded-lg border px-3 py-3 ${gameState.currentTurn === bottomColor ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-sm font-semibold text-slate-700 truncate">{bottomPlayerName}</p>
                  <p className="mt-1 text-6xl font-semibold tracking-tight">
                    {Math.floor(bottomTime / 60).toString().padStart(2, '0')}:{(bottomTime % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {showResultDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Game Finished</h2>
            <p className="mt-2 text-sm text-slate-700">{resultSummary}</p>
            <div className="mt-5 flex justify-end">
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleResultContinue}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
