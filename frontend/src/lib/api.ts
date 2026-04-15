const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const defaultBaseUrl =
  typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000'
        : window.location.origin)
    : 'http://localhost:8000';

export const API_BASE_URL = envBaseUrl ?? defaultBaseUrl;

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export type GameFormat = 'blitz' | 'rapid' | 'powers' | 'knockout';

type EventPhase =
  | 'registration'
  | 'mini_game_1'
  | 'qualifiers'
  | 'elimination_cut'
  | 'mini_game_2'
  | 'swiss_stage'
  | 'round_robin_top6'
  | 'finals'
  | 'completed';

export interface TimeControlConfig {
  time: number;
  increment: number;
  tokens: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  harmony_tokens: number;
  player_1_harmony: number;     // <-- ADDED
  player_2_harmony: number;     // <-- ADDED
  net_time_diff: number;
  current_group: string | null;
  included_in_event?: boolean;
  status?: string;
  queue_bucket?: 'ready' | 'runners';
  passcode?: string;
  is_eliminated?: boolean;
}

export interface SessionState {
  id: string;
  format: GameFormat;
  status: 'ongoing' | 'completed';
  white_player_id: string;
  black_player_id: string;
  white_player_name: string;
  black_player_name: string;
  current_turn: 'w' | 'b';
  fen: string;
  white_time: number;
  black_time: number;
  increment: number;
  white_harmony_tokens: number;
  black_harmony_tokens: number;
  used_powers: {
    white: {
      convert: boolean;
      leap: boolean;
      trade: boolean;
      resurrection: boolean;
    };
    black: {
      convert: boolean;
      leap: boolean;
      trade: boolean;
      resurrection: boolean;
    };
  };
}

export interface WaitingPlayer {
  player_id: string;
  player_name: string;
}

export interface PublicRoundState {
  current_format: GameFormat;
  leaderboard: PlayerProfile[];
}

interface RawTeam {
  team_name: string;
  wins?: number;
  losses?: number;
  nr?: number;
  points?: number;
  harmony_points?: number;
  player_1_harmony?: number;    // <-- ADDED
  player_2_harmony?: number;    // <-- ADDED
  net_time_diff?: number;
  current_group?: string;
  games_played?: number;
  is_eliminated?: boolean;
}

interface EventStatusResponse {
  current_phase: EventPhase;
}

interface BackendScheduleMatch {
  game_id: string;
  team_a: string;
  team_b: string;
  variant: string;
  stage?: string;
  group_id?: string;
  status: 'pending' | 'ongoing' | 'completed';
  board_number?: number;
  round_number?: number;
}

export interface ScheduleMatch extends BackendScheduleMatch {
  format: GameFormat;
  time_seconds: number;
  increment_seconds: number;
}

export interface SavedGameState {
  status: 'restored' | 'new_game';
  current_fen?: string;
  team_a_time?: number;
  team_b_time?: number;
  move_count?: number;
}

const DEFAULT_TIME_CONTROLS: Record<GameFormat, TimeControlConfig> = {
  blitz: { time: 300, increment: 3, tokens: 0 },
  rapid: { time: 300, increment: 3, tokens: 0 },
  powers: { time: 300, increment: 3, tokens: 0 },
  knockout: { time: 300, increment: 0, tokens: 3 },
};

const usedPowersDefault = {
  white: { convert: false, leap: false, trade: false, resurrection: false },
  black: { convert: false, leap: false, trade: false, resurrection: false },
};

function normalizeFormatFromMatch(match: BackendScheduleMatch): GameFormat {
  const key = (match.variant || '').trim().toLowerCase();
  const stage = (match.stage || '').trim().toLowerCase();
  if (key === 'modified') return 'powers';
  if (stage.startsWith('finals')) return 'knockout';
  if (stage === 'swiss_stage' || stage === 'round_robin_top6') return 'rapid';
  if (stage === 'qualifiers') {
    if (key === '5+0') return 'rapid';
    if (key === '5+3') return 'blitz';
  }
  if (key === '5+0') return 'knockout';
  if (key === '10+3') return 'knockout';
  if (key === '5+3') return 'blitz';
  return 'rapid';
}

function parseClockFromMatch(match: BackendScheduleMatch): { time: number; increment: number } {
  const key = (match.variant || '').trim().toLowerCase();
  const stage = (match.stage || '').trim().toLowerCase();
  if (stage.startsWith('finals')) return { time: 10 * 60, increment: 3 };
  if (stage === 'swiss_stage' || stage === 'round_robin_top6') return { time: 5 * 60, increment: 0 };
  if (key === 'modified') return { time: 5 * 60, increment: 3 };
  if (stage === 'qualifiers') return { time: 5 * 60, increment: 3 };
  if (key === '5+0') return { time: 5 * 60, increment: 0 };
  if (key === '5+3') return { time: 5 * 60, increment: 3 };
  if (key === '10+3') return { time: 10 * 60, increment: 3 };
  return { time: 5 * 60, increment: 3 };
}

function phaseToFormat(phase: EventPhase): GameFormat {
  if (phase === 'finals') return 'knockout';
  if (phase === 'swiss_stage' || phase === 'round_robin_top6') return 'rapid';
  if (phase === 'qualifiers') return 'blitz';
  return 'rapid';
}

function mapTeam(team: RawTeam, passcode?: string): PlayerProfile {
  return {
    id: team.team_name,
    name: team.team_name,
    points: Number(team.points ?? 0),
    wins: Number(team.wins ?? 0),
    losses: Number(team.losses ?? 0),
    draws: Number(team.nr ?? 0),
    games_played: Number(team.games_played ?? 0),
    harmony_tokens: Number(team.harmony_points ?? 0),
    player_1_harmony: Number(team.player_1_harmony ?? 0), // <-- ADDED
    player_2_harmony: Number(team.player_2_harmony ?? 0), // <-- ADDED
    net_time_diff: Number(team.net_time_diff ?? 0),
    current_group: team.current_group || null,
    included_in_event: !team.is_eliminated,
    status: team.is_eliminated ? 'inactive' : 'active',
    queue_bucket: team.is_eliminated ? 'runners' : 'ready',
    passcode,
    is_eliminated: team.is_eliminated || false,
  };
}

function scheduleToSession(match: ScheduleMatch): SessionState {
  return {
    id: match.game_id,
    format: match.format,
    status: match.status === 'completed' ? 'completed' : 'ongoing',
    white_player_id: match.team_a,
    black_player_id: match.team_b,
    white_player_name: match.team_a,
    black_player_name: match.team_b,
    current_turn: 'w',
    fen: 'start',
    white_time: match.time_seconds,
    black_time: match.time_seconds,
    increment: match.increment_seconds,
    white_harmony_tokens: 3,
    black_harmony_tokens: 3,
    used_powers: usedPowersDefault,
  };
}

async function postJson(path: string, body: unknown, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });
}

// --- UPDATED: Auto-Registers if team doesn't exist, rejects if wrong passcode ---
export async function bootstrapPlayer(
  name: string, 
  passcodeHint: string, 
  playerNumber: 1 | 2 | 'team' 
): Promise<PlayerProfile> {
  const cleanName = name.trim();
  const cleanPasscode = passcodeHint.trim();

  if (!cleanName || !cleanPasscode) {
    throw new Error('Team Name and Passcode are required.');
  }

  // 1. Try to login first
  const loginResp = await postJson('/api/v1/teams/login', { 
    team_name: cleanName, 
    passcode: cleanPasscode 
  });
  
  if (!loginResp.ok) {
    // 2. If login fails, try to automatically register them
    const registerResp = await postJson('/api/v1/teams/register', { 
      team_name: cleanName, 
      passcode: cleanPasscode 
    });
    
    if (!registerResp.ok) {
      // 3. If register ALSO fails, the team name is taken and they used the wrong password
      throw new Error('Incorrect Passcode for this Team.');
    }
  }

  // Use sessionStorage to ensure the user is logged out when the tab closes
  sessionStorage.setItem('team_name', cleanName);
  sessionStorage.setItem('passcode', cleanPasscode);
  sessionStorage.setItem('player_number', playerNumber.toString());

  const leaderboard = await fetchLeaderboard();
  const found = leaderboard.find((p) => p.name === cleanName);
  
  if (found) {
    return { ...found, passcode: cleanPasscode };
  }

  return {
    id: cleanName,
    name: cleanName,
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    games_played: 0,
    harmony_tokens: 0,
    player_1_harmony: 0,
    player_2_harmony: 0,
    net_time_diff: 0,
    current_group: null,
    included_in_event: true,
    status: 'active',
    queue_bucket: 'ready',
    passcode: cleanPasscode,
    is_eliminated: false,
  };
}

export async function fetchLeaderboard(): Promise<PlayerProfile[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/teams/leaderboard`);
  if (!response.ok) {
    throw new Error('Unable to load leaderboard');
  }
  const data = (await response.json()) as RawTeam[];
  return data.map((team) => mapTeam(team));
}

export async function fetchRoundState(): Promise<PublicRoundState> {
  const [leaderboard, phaseResp] = await Promise.all([
    fetchLeaderboard(),
    fetch(`${API_BASE_URL}/api/v1/event/status`),
  ]);

  if (!phaseResp.ok) {
    throw new Error('Unable to load round state');
  }

  const phase = (await phaseResp.json()) as EventStatusResponse;
  return {
    current_format: phaseToFormat(phase.current_phase || 'registration'),
    leaderboard,
  };
}

export async function fetchTeamSchedule(teamName: string): Promise<ScheduleMatch[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/teams/${encodeURIComponent(teamName)}/schedule`);
  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { matches?: BackendScheduleMatch[] };
  const matches = data.matches ?? [];

  return matches.map((match) => {
    const clock = parseClockFromMatch(match);
    return {
      ...match,
      format: normalizeFormatFromMatch(match),
      time_seconds: clock.time,
      increment_seconds: clock.increment,
    };
  });
}

export async function fetchGameState(gameId: string): Promise<SavedGameState> {
  const response = await fetch(`${API_BASE_URL}/api/v1/game/${encodeURIComponent(gameId)}/state`);
  if (!response.ok) {
    throw new Error('Unable to load game state');
  }
  return response.json() as Promise<SavedGameState>;
}

export async function fetchSessionState(sessionId: string): Promise<SessionState> {
  const snapshot = await fetchGameState(sessionId);
  return {
    id: sessionId,
    format: 'rapid',
    status: snapshot.status === 'restored' ? 'ongoing' : 'ongoing',
    white_player_id: 'team_a',
    black_player_id: 'team_b',
    white_player_name: 'Team A',
    black_player_name: 'Team B',
    current_turn: 'w',
    fen: snapshot.current_fen || 'start',
    white_time: snapshot.team_a_time ?? 600,
    black_time: snapshot.team_b_time ?? 600,
    increment: 0,
    white_harmony_tokens: 3,
    black_harmony_tokens: 3,
    used_powers: usedPowersDefault,
  };
}

export async function adminLogin(password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin-secret': password,
      },
    });

    return response.ok;
  } catch (err) {
    console.error("Admin login check failed:", err);
    return false;
  }
}

export async function fetchAdminState(password: string): Promise<{
  game_order: GameFormat[];
  current_format: GameFormat;
  current_phase: string;
  time_controls: Record<GameFormat, TimeControlConfig>;
  players: PlayerProfile[];
  runners_queue: PlayerProfile[];
  active_sessions: SessionState[];
  waiting_players: WaitingPlayer[];
}> {
  if (!(await adminLogin(password))) {
    throw new Error('Unauthorized');
  }

  const [players, phaseResp] = await Promise.all([
    fetchLeaderboard(),
    fetch(`${API_BASE_URL}/api/v1/event/status`),
  ]);

  if (!phaseResp.ok) {
    throw new Error('Unable to load event phase');
  }

  const phase = await phaseResp.json() as EventStatusResponse;

  return {
    game_order: ['blitz', 'rapid', 'powers', 'knockout'],
    current_format: phaseToFormat(phase.current_phase || 'registration'),
    current_phase: phase.current_phase || 'registration',
    time_controls: DEFAULT_TIME_CONTROLS,
    players,
    runners_queue: players.filter((p) => p.queue_bucket === 'runners'),
    active_sessions: [],
    waiting_players: [],
  };
}

export async function advanceEventPhase(password: string): Promise<{ status: string; new_phase?: string; message?: string }> {
  if (!(await adminLogin(password))) {
    throw new Error('Unauthorized');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/advance-phase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'admin-secret': password,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Unable to advance phase' }));
    throw new Error(payload.detail || 'Unable to advance phase');
  }

  return response.json() as Promise<{ status: string; new_phase?: string; message?: string }>;
}

export async function setEventPhase(password: string, targetPhase: string): Promise<{ status: string; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/set-phase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'admin-secret': password,
    },
    body: JSON.stringify({ target_phase: targetPhase })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Unable to force phase' }));
    throw new Error(payload.detail || 'Unable to force phase');
  }

  return response.json();
}

export async function submitGameResult(payload: {
  game_id: string;
  team_a: string;
  team_b: string;
  winner_team: string | null;
  team_a_time_left: number;
  team_b_time_left: number;
  is_draw: boolean;
  submitter_team: string;
  passcode: string;
  harmony: boolean | false; //harmony true for modified chess 
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/game/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'Unable to submit game result' }));
    throw new Error(body.detail || 'Unable to submit game result');
  }
}

export async function updateAdminGameOrder(_password: string, _gameOrder: GameFormat[]): Promise<GameFormat[]> {
  throw new Error('Not supported in pure backend mode');
}

export async function updateAdminPlayer(_password: string, _playerId: string, _points: number, _harmonyTokens: number): Promise<PlayerProfile> {
  throw new Error('Not supported in pure backend mode');
}

export async function updateAdminTimeControl(_password: string, _format: GameFormat, _timeSeconds: number, _increment: number): Promise<Record<GameFormat, TimeControlConfig>> {
  throw new Error('Not supported in pure backend mode');
}

// --- UPDATED: Dual-logic Puzzle Submission (Team or Individual) ---
export async function submitPuzzleResult(payload: { 
  team_name: string; 
  passcode: string; 
  puzzles_correct: number; 
  total_puzzles: number; 
  points_earned: number; 
  player_number: 1 | 2 | 'team'; // <-- Accepts 'team' mode
}): Promise<void> {
  
  const backendPayload = {
    ...payload,
    player_number: payload.player_number === 'team' ? null : payload.player_number
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/minigame/puzzles/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendPayload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'Unable to submit puzzle result' }));
    throw new Error(body.detail || 'Unable to submit puzzle result');
  }
}

// --- ADDED: Spend Harmony Points (Targeted Deductions) ---
export async function spendHarmonyPoints(payload: {
  team_name: string;
  passcode: string;
  game_id: string;
  points_to_spend: number;
  player_number: 1 | 2; // <-- Tells backend whose stash to deduct from
}): Promise<{ status: string; message: string; time_deduction_seconds: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/game/spend-harmony`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'Unable to spend harmony points' }));
    throw new Error(body.detail || 'Unable to spend harmony points');
  }
  
  return response.json();
}
