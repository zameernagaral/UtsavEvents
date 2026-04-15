import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Key,
  Lock,
  Puzzle,
  Swords,
  Trophy,
  Crown,
  Target,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Globe,
  Gem,
  Award,
  ScrollText,
  Hash,
  Brain,
  Route,
  Sparkles,
} from 'lucide-react';

import { Header } from '@/components/header';
import { API_BASE_URL } from '@/lib/api';

const STORY_TITLE = 'Recover the Lost Artifact';

const KEY_CARD_ROWS = [
  { civilization: 'India', variant: 'Chaturanga', piece: '♞' },
  { civilization: 'Persia', variant: 'Shatranj', piece: '♜' },
  { civilization: 'China', variant: 'Xiangqi', piece: '♝' },
  { civilization: 'Japan', variant: 'Shogi', piece: '♛' },
  { civilization: 'Mediterranean', variant: 'Courier Chess', piece: '♚' },
  { civilization: 'Russia', variant: 'Modern Chess', piece: '♟' },
];

const ROUTE_CODE = 'VKDWUDQM   ALDQJTL   VKRJL   FRXULHU';
const DECRYPTED_VARIANTS = ['SHATRANJ', 'XIANGQI', 'SHOGI', 'COURIER'];

const MATCH_VARIANTS = ['Xiangqi', 'Shatranj', 'Shogi', 'Courier'] as const;
const MATCH_CIVILIZATIONS = ['China', 'Persia', 'Japan', 'Mediterranean'] as const;
const MATCH_PIECES = ['♝', '♜', '♛', '♚'] as const;

const MATCH_ANSWER: Record<(typeof MATCH_VARIANTS)[number], { civilization: string; piece: string }> = {
  Xiangqi: { civilization: 'China', piece: '♝' },
  Shatranj: { civilization: 'Persia', piece: '♜' },
  Shogi: { civilization: 'Japan', piece: '♛' },
  Courier: { civilization: 'Mediterranean', piece: '♚' },
};

const ORDER_START = ['♜', '♝', '♛', '♚'];
const ORDER_ANSWER = ['♚', '♛', '♜', '♝'];

const STORAGE_KEY = 'minigame1_progress_v2';
const STARTED_KEY = 'minigame1_started_v2';

type MatchState = Record<string, { civilization: string | null; piece: string | null }>;
type MiniGameProgress = {
  stepIndex: number;
  caesarAnswer: string;
  matchState: MatchState;
  orderSlots: Array<string | null>;
  finalAnswer: string;
  finalAttempts: number;
  submitted: boolean;
};

const STEPS = [
  { title: 'Context',    Icon: BookOpen, desc: 'Mission briefing' },
  { title: 'Key Card',   Icon: Key,      desc: 'Civ-to-piece map' },
  { title: 'Cipher',     Icon: Lock,     desc: 'Route code' },
  { title: 'Decryption', Icon: Hash,     desc: 'Caesar decode' },
  { title: 'Matching',   Icon: Puzzle,   desc: 'Drag & match' },
  { title: 'Hierarchy',  Icon: Crown,    desc: 'Order by value' },
  { title: 'Artifact',   Icon: Trophy,   desc: 'Submit answer' },
];

const defaultProgress = (): MiniGameProgress => ({
  stepIndex: 0,
  caesarAnswer: '',
  matchState: MATCH_VARIANTS.reduce<MatchState>((acc, v) => { acc[v] = { civilization: null, piece: null }; return acc; }, {}),
  orderSlots: [null, null, null, null],
  finalAnswer: '',
  finalAttempts: 0,
  submitted: false,
});

const normalizeTokens = (v: string) => v.toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean);
const isCaesarCorrect = (v: string) => { const t = normalizeTokens(v); return t.length === DECRYPTED_VARIANTS.length && DECRYPTED_VARIANTS.every((w, i) => t[i] === w); };
const isMatchComplete = (m: MatchState) => MATCH_VARIANTS.every(v => m[v]?.civilization === MATCH_ANSWER[v].civilization && m[v]?.piece === MATCH_ANSWER[v].piece);
const isOrderCorrect = (s: Array<string | null>) => s.every((p, i) => p === ORDER_ANSWER[i]);

export default function MiniGame() {
  const [progress, setProgress] = useState<MiniGameProgress>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return { ...defaultProgress(), ...JSON.parse(s) }; } catch {}
    return defaultProgress();
  });
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(() => {
    try { return localStorage.getItem(STARTED_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }, [progress]);

  const player = useMemo(() => {
    const t = sessionStorage.getItem('team_name') || localStorage.getItem('team_name');
    const p = sessionStorage.getItem('passcode') || localStorage.getItem('passcode');
    const rawNum = sessionStorage.getItem('player_number') || localStorage.getItem('player_number');
    const playerNumber = rawNum === '1' ? 1 : rawNum === '2' ? 2 : rawNum === 'team' ? 'team' : null;
    return t && p ? { id: t, passcode: p, playerNumber } : null;
  }, []);

  const { stepIndex } = progress;
  const step = STEPS[stepIndex];
  const StepIcon = step.Icon;

  const startGame = () => {
    setHasStarted(true);
    localStorage.setItem(STARTED_KEY, 'true');
  };

  const go = (n: number) => { setStatus('idle'); setMessage(''); setProgress(p => ({ ...p, stepIndex: n })); };
  const handleCaesarChange = (v: string) => { setProgress(p => ({ ...p, caesarAnswer: v })); setStatus('idle'); setMessage(''); };
  const handleFinalChange = (v: string) => { setProgress(p => ({ ...p, finalAnswer: v })); setStatus('idle'); setMessage(''); };
  const handleDropMatch = (variant: string, type: 'civilization' | 'piece', value: string) =>
    setProgress(p => ({ ...p, matchState: { ...p.matchState, [variant]: { ...p.matchState[variant], [type]: value } } }));
  const handleOrderDrop = (idx: number, piece: string) => setProgress(p => {
    const next = [...p.orderSlots]; const ei = next.findIndex(x => x === piece);
    if (ei !== -1) next[ei] = next[idx]; next[idx] = piece; return { ...p, orderSlots: next };
  });
  const resetMatch = () => setProgress(p => ({ ...p, matchState: defaultProgress().matchState }));
  const resetOrder = () => setProgress(p => ({ ...p, orderSlots: [null, null, null, null] }));

  const submitFinalAnswer = async () => {
    const lockedOut = progress.finalAttempts >= 3;
    if (lockedOut) {
      setStatus('error');
      setMessage('No attempts remaining. The answer is locked.');
      return;
    }
    const trimmed = progress.finalAnswer.trim().toUpperCase();
    if (!trimmed) { setStatus('error'); setMessage('Enter your answer before submitting.'); return; }
    if (!player) { setStatus('error'); setMessage('Team not found. Please re-login.'); return; }
    setSubmitting(true); setStatus('idle'); setMessage('');
    try {
      const payload: Record<string, unknown> = { team_name: player.id, passcode: player.passcode, answer: trimmed };
      if (player.playerNumber === 1 || player.playerNumber === 2) {
        payload.player_number = player.playerNumber;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/minigame/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({ status: 'failure', message: 'Unable to verify answer.' }));
      if (!res.ok || d.status !== 'success') {
        const nextAttempts = progress.finalAttempts + 1;
        setProgress((prev) => ({ ...prev, finalAttempts: nextAttempts }));
        const remaining = Math.max(0, 3 - nextAttempts);
        setStatus('error');
        setMessage(remaining > 0 ? `Incorrect. ${remaining} attempts left.` : 'No attempts remaining. The answer is locked.');
        return;
      }
      setStatus('success'); setMessage('Correct! The artifact has been recovered.');
      setProgress(p => ({ ...p, submitted: true }));
    } catch (e) { setStatus('error'); setMessage(e instanceof Error ? e.message : 'Unable to verify answer.'); }
    finally { setSubmitting(false); }
  };

  const caesarValid = isCaesarCorrect(progress.caesarAnswer);
  const matchValid = isMatchComplete(progress.matchState);
  const orderValid = isOrderCorrect(progress.orderSlots);
  const nextDisabled = (stepIndex === 3 && !caesarValid) || (stepIndex === 4 && !matchValid) || (stepIndex === 5 && !orderValid);

  // Landing Screen
  // Landing Screen
if (!hasStarted) {
  return (
    <div className="mg">
      <Header minimal />
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #f9fafb 100%)',
        padding: '40px 20px'
      }}>
        <div style={{
          maxWidth: 600,
          width: '100%',
          textAlign: 'center'
        }}>
          {/* Removed the Route icon div */}

          <h1 style={{
            fontFamily: 'inherit',
            fontSize: 'clamp(52px, 10vw, 72px)',  // Increased font size
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#111827',
            margin: '0 0 12px'  // Adjusted margin
          }}>
            ROOTS<span style={{ color: '#2563eb' }}> &amp; ROUTES</span>
          </h1>

          <p style={{
            fontFamily: 'inherit',
            fontSize: 20,  // Increased from 16
            color: '#6b7280',
            margin: '0 0 32px',
            fontWeight: 500
          }}>
            Recover the Lost Artifact
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: 40,
            padding: '8px 20px',  // Slightly larger padding
            marginBottom: 32
          }}>
            <Sparkles size={16} color="#2563eb" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', letterSpacing: '0.05em' }}>MINI GAME 1</span>
          </div>

          <p style={{
            fontFamily: 'inherit',
            fontSize: 17,  // Increased from 15
            color: '#4b5563',
            lineHeight: 1.6,
            margin: '0 0 32px',
            maxWidth: 480,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Decrypt the ancient route code, match chess variants to their civilizations, 
            and recover the lost artifact hidden within the Royal Archive.
          </p>

          <button
            onClick={startGame}
            style={{
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: '#2563eb',
              border: 'none',
              borderRadius: 40,
              padding: '16px 36px',  // Increased padding
              fontSize: 16,  // Increased from 15
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Begin Journey <ArrowRight size={18} />
          </button>

          <p style={{
            fontFamily: 'inherit',
            fontSize: 12,  // Increased from 11
            color: '#9ca3af',
            marginTop: 48,
            letterSpacing: '0.05em'
          }}>
            Only teams who reconstruct the route cipher can reveal the artifact
          </p>
        </div>
      </div>
    </div>
  );

  }

  /* ─── step content ─────────────────────────────────────────── */
  const renderStep = () => {
    switch (stepIndex) {
      case 0: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { Icon: ScrollText, title: 'Archive Decrypted', text: 'The Royal Archive of Chaturanga has been partially decrypted — fragments surface across civilizations.' },
            { Icon: Globe, title: 'Global Fragments', text: 'Chess variants scattered across history. The final artifact is hidden within the route code.' },
            { Icon: Target, title: 'Your Mission', text: 'Only teams who reconstruct the route cipher can reveal the artifact. Follow each step carefully.' },
          ].map(({ Icon, title, text }, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#f0f6ff', border: '1px solid #dbeafe', borderRadius: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color="#2563eb" />
              </div>
              <div>
                <p style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 3px' }}>{title}</p>
                <p style={{ fontFamily: 'inherit', fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{text}</p>
              </div>
            </div>
          ))}
        </div>
      );

      case 1: return (
        <div>
          <p style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2563eb', marginBottom: 12 }}>Each civilization guards one piece</p>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
              <thead>
                <tr style={{ background: '#f8faff', borderBottom: '1px solid #e5e7eb' }}>
                  {['Civilization', 'Chess Variant', 'Piece'].map(h => (
                    <th key={h} style={{ fontFamily: 'inherit', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KEY_CARD_ROWS.map((row, i) => (
                  <tr key={row.variant} style={{ borderBottom: i < KEY_CARD_ROWS.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                    <td style={{ fontFamily: 'inherit', padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{row.civilization}</td>
                    <td style={{ fontFamily: 'inherit', padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{row.variant}</td>
                    <td style={{ fontFamily: 'inherit', padding: '12px 16px', fontSize: 22, color: '#2563eb' }}>{row.piece}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      case 2: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 14, padding: '26px 20px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'inherit', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 12 }}>Archive File — ROUTE_CODE</p>
            <div style={{ fontFamily: 'inherit', fontSize: 'clamp(13px,2.5vw,19px)', fontWeight: 800, letterSpacing: '0.15em', color: '#60a5fa', wordBreak: 'break-all', lineHeight: 1.8 }}>{ROUTE_CODE}</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#6b7280' }}>File ID</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>ARC-{Math.floor(Math.random() * 9000 + 1000)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Encryption</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Fragments</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>4 of 4</span>
            </div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
              <span style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#374151' }}>Status: Encrypted</span>
            </div>
            <div style={{ marginTop: 10, height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: '#3b82f6', borderRadius: 2 }} />
            </div>
            <p style={{ fontFamily: 'inherit', fontSize: 11, color: '#9ca3af', marginTop: 10, marginBottom: 0 }}>
              This file contains the route code required to locate the artifact.
            </p>
          </div>
        </div>
      );

      case 3: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'inherit', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 8, opacity: 0.8 }}>Encrypted Message</p>
            <div style={{ fontFamily: 'monospace', fontSize: 'clamp(12px,2vw,16px)', fontWeight: 700, letterSpacing: '0.1em', color: '#60a5fa', wordBreak: 'break-all', lineHeight: 1.6 }}>{ROUTE_CODE}</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
              <p style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', margin: 0 }}>Decryption Required</p>
            </div>
            <p style={{ fontFamily: 'inherit', fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>
              Apply the cipher to reveal the hidden message.
            </p>
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Decoded Message</label>
            <div style={{ position: 'relative' }}>
              <input 
                value={progress.caesarAnswer} 
                onChange={e => handleCaesarChange(e.target.value)}
                placeholder="Enter decrypted text"
                style={{ 
                  fontFamily: 'monospace', 
                  width: '100%', 
                  background: '#fff', 
                  border: `1.5px solid ${caesarValid ? '#2563eb' : '#e5e7eb'}`, 
                  borderRadius: 10, 
                  padding: '12px 46px 12px 16px', 
                  fontSize: 13, 
                  fontWeight: 500, 
                  color: '#111827', 
                  outline: 'none', 
                  boxSizing: 'border-box' 
                }}
              />
              {caesarValid && <CheckCircle2 size={17} color="#2563eb" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} />}
            </div>
            {progress.caesarAnswer && !caesarValid && (
              <p style={{ fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#dc2626', marginTop: 7 }}>
                <XCircle size={13} /> Incorrect
              </p>
            )}
          </div>
        </div>
      );

      case 4: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
              <p style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', margin: 0 }}>Drag & Match</p>
            </div>
            <p style={{ fontFamily: 'inherit', fontSize: 13, color: '#374151', margin: '8px 0 0 0', lineHeight: 1.5 }}>
              Match each chess variant to its civilization and piece.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Civilizations', Icon: Globe, items: MATCH_CIVILIZATIONS, prefix: 'civilization', isPiece: false },
              { label: 'Pieces', Icon: Gem, items: MATCH_PIECES, prefix: 'piece', isPiece: true },
            ].map(({ label, Icon, items, prefix, isPiece }) => (
              <div key={label} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                <p style={{ fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 12px' }}>
                  <Icon size={12} color="#3b82f6" />{label}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(items as readonly string[]).map(item => (
                    <div 
                      key={item} 
                      draggable 
                      onDragStart={e => e.dataTransfer.setData('text/plain', `${prefix}:${item}`)}
                      style={{ 
                        fontFamily: 'inherit', 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: 100, 
                        padding: isPiece ? '6px 16px' : '8px 16px', 
                        fontSize: isPiece ? 20 : 12, 
                        fontWeight: 600, 
                        color: '#334155', 
                        cursor: 'grab', 
                        userSelect: 'none',
                        transition: 'all 0.1s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MATCH_VARIANTS.map(variant => {
              const entry = progress.matchState[variant];
              const isComplete = entry?.civilization && entry?.piece;
              return (
                <div 
                  key={variant} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '110px 1fr 70px', 
                    alignItems: 'center', 
                    gap: 10, 
                    background: isComplete ? '#f0fdf4' : '#ffffff', 
                    border: `1px solid ${isComplete ? '#bbf7d0' : '#e5e7eb'}`,
                    borderRadius: 12, 
                    padding: '10px 14px',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#111827' }}>
                    <Swords size={13} color="#3b82f6" style={{ flexShrink: 0 }} />
                    {variant}
                  </div>

                  <div 
                    style={{ 
                      minHeight: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      border: `1.5px dashed ${entry?.civilization ? '#86efac' : '#d1d5db'}`,
                      borderRadius: 8, 
                      padding: '6px 12px', 
                      fontFamily: 'inherit', 
                      fontSize: 12, 
                      fontWeight: 500, 
                      color: '#111827',
                      background: entry?.civilization ? '#dcfce7' : '#fafafa'
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { 
                      e.preventDefault(); 
                      const d = e.dataTransfer.getData('text/plain'); 
                      if (d.startsWith('civilization:')) handleDropMatch(variant, 'civilization', d.replace('civilization:', '')); 
                    }}
                  >
                    {entry?.civilization || <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 400 }}>Drop civilization →</span>}
                  </div>

                  <div 
                    style={{ 
                      minHeight: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      border: `1.5px dashed ${entry?.piece ? '#86efac' : '#d1d5db'}`,
                      borderRadius: 8, 
                      fontFamily: 'inherit', 
                      fontSize: 22, 
                      color: '#3b82f6',
                      background: entry?.piece ? '#dcfce7' : '#fafafa'
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { 
                      e.preventDefault(); 
                      const d = e.dataTransfer.getData('text/plain'); 
                      if (d.startsWith('piece:')) handleDropMatch(variant, 'piece', d.replace('piece:', '')); 
                    }}
                  >
                    {entry?.piece || <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'inherit', fontWeight: 400 }}>→ drop</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <button 
              onClick={resetMatch} 
              style={{ 
                fontFamily: 'inherit', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 6, 
                background: '#ffffff', 
                border: '1px solid #e5e7eb', 
                borderRadius: 8, 
                padding: '7px 14px', 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#6b7280', 
                cursor: 'pointer',
                transition: 'all 0.1s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
            >
              <RefreshCw size={12} /> Reset
            </button>
            
            {matchValid ? (
              <span style={{ fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                <CheckCircle2 size={14} /> All matched
              </span>
            ) : (
              <span style={{ fontFamily: 'inherit', fontSize: 11, color: '#9ca3af' }}>
                {Object.values(progress.matchState).filter(v => v.civilization && v.piece).length} / {MATCH_VARIANTS.length}
              </span>
            )}
          </div>
        </div>
      );

      case 5: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: '#f0f6ff', border: '1px solid #dbeafe', borderRadius: 12 }}>
            <Award size={17} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1e40af', margin: 0 }}>Arrange according to the value of each piece (Highest to Lowest)</p>
          </div>
          <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 14 }}>
            <p style={{ fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 10px' }}>
              <Gem size={11} color="#2563eb" />Pieces to Place
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {ORDER_START.filter(p => !progress.orderSlots.includes(p)).map(piece => (
                <div key={piece} draggable onDragStart={e => e.dataTransfer.setData('text/plain', `order:${piece}`)}
                  style={{ fontFamily: 'inherit', background: '#fff', border: '1px solid #dbeafe', borderRadius: 100, padding: '6px 20px', fontSize: 24, color: '#1e40af', cursor: 'grab', userSelect: 'none' }}>
                  {piece}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {progress.orderSlots.map((piece, idx) => (
              <div key={idx}
                style={{ minHeight: 72, border: `2px ${piece ? 'solid #bfdbfe' : 'dashed #e5e7eb'}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#2563eb', background: piece ? '#eff6ff' : '#fafafa', cursor: piece ? 'grab' : 'default' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const d = e.dataTransfer.getData('text/plain'); if (d.startsWith('order:')) handleOrderDrop(idx, d.replace('order:', '')); }}
                draggable={!!piece} onDragStart={e => { if (piece) e.dataTransfer.setData('text/plain', `order:${piece}`); }}>
                {piece || <span style={{ fontFamily: 'inherit', fontSize: 11, color: '#d1d5db', fontWeight: 700 }}>{idx + 1}</span>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={resetOrder} style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#4b5563', cursor: 'pointer' }}>
              <RefreshCw size={12} />Reset
            </button>
            {orderValid && <span style={{ fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#2563eb' }}><CheckCircle2 size={14} />Confirmed</span>}
          </div>
        </div>
      );

      case 6: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: 18, paddingTop: 2, paddingBottom: 2 }}>
            <p style={{ fontFamily: 'inherit', fontSize: 14, fontStyle: 'italic', color: '#374151', lineHeight: 1.7, margin: 0 }}>
              "The artifact is the piece that commands the board but bows to the crown."
            </p>
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Your Answer</label>
            <div style={{ position: 'relative' }}>
              <input value={progress.finalAnswer} onChange={e => handleFinalChange(e.target.value)}
                placeholder="TYPE YOUR ANSWER"
                disabled={progress.submitted || progress.finalAttempts >= 3}
                style={{ fontFamily: 'inherit', width: '100%', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '14px 46px 14px 16px', fontSize: 15, fontWeight: 800, letterSpacing: '0.08em', color: '#111827', outline: 'none', boxSizing: 'border-box', opacity: progress.submitted || progress.finalAttempts >= 3 ? 0.6 : 1 }}
              />
              {progress.submitted && status === 'success' && <CheckCircle2 size={17} color="#2563eb" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} />}
            </div>
          </div>
          {message && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '12px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, ...(status === 'success' ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' } : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }) }}>
              {status === 'success' ? <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> : <XCircle size={14} style={{ flexShrink: 0 }} />}
              {message}
            </div>
          )}
          <button onClick={submitFinalAnswer} disabled={submitting || progress.submitted || progress.finalAttempts >= 3}
            style={{ fontFamily: 'inherit', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: submitting || progress.submitted ? '#93c5fd' : '#2563eb', border: 'none', borderRadius: 12, padding: '15px 0', fontSize: 14, fontWeight: 800, color: '#fff', cursor: submitting || progress.submitted ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'background 0.2s' }}>
            {submitting ? <><RefreshCw size={16} />Checking...</>
              : progress.submitted || progress.finalAttempts >= 3 ? <><CheckCircle2 size={16} />Answer Locked</>
              : <><Trophy size={16} />Submit Answer</>}
          </button>
        </div>
      );
      default: return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');

        .mg * { font-family: 'DM Sans', sans-serif !important; box-sizing: border-box; }
        .mg { font-family: 'DM Sans', sans-serif; min-height: 100vh; background: #f9fafb; color: #111827; }

        .mg-layout { display: grid; grid-template-columns: 280px 1fr; min-height: calc(100vh - 64px); }
        @media (max-width: 800px) { .mg-layout { grid-template-columns: 1fr; } .mg-sidebar { display: none !important; } }

        .mg-sidebar {
          background: #fff;
          border-right: 1px solid #e5e7eb;
          padding: 36px 28px 40px;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: calc(100vh - 64px);
          overflow-y: auto;
        }

        .mg-brand { margin-bottom: 36px; }
        .mg-brand-pill {
          display: inline-flex; align-items: center; gap: 5px;
          background: #eff6ff; border: 1px solid #dbeafe;
          border-radius: 6px; padding: 3px 10px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563eb; margin-bottom: 12px;
        }
        .mg-brand-title { font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.025em; line-height: 1.15; margin: 0 0 6px; }
        .mg-brand-title span { color: #2563eb; }
        .mg-brand-sub { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #9ca3af; font-weight: 500; }

        .mg-roadmap { position: relative; flex: 1; }
        .mg-roadmap-line {
          position: absolute;
          left: 15px;
          top: 16px;
          bottom: 16px;
          width: 2px;
          background: #e5e7eb;
          border-radius: 2px;
          z-index: 0;
        }
        .mg-roadmap-line-fill {
          position: absolute;
          left: 0; top: 0; width: 100%;
          background: #2563eb;
          border-radius: 2px;
          transition: height 0.4s ease;
        }
        .mg-roadmap-items { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0; }
        .mg-roadmap-item { display: flex; align-items: flex-start; gap: 14px; padding: 6px 0; }
        .mg-node {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          position: relative; z-index: 2;
        }
        .mg-node-idle { background: #fff; border: 2px solid #e5e7eb; }
        .mg-node-done { background: #eff6ff; border: 2px solid #bfdbfe; }
        .mg-node-active { background: #2563eb; border: 2px solid #2563eb; box-shadow: 0 0 0 4px #dbeafe; }
        .mg-node-body { padding-top: 5px; flex: 1; }
        .mg-node-title { font-size: 13px; font-weight: 700; line-height: 1.2; }
        .mg-node-title-idle { color: #9ca3af; }
        .mg-node-title-done { color: #374151; }
        .mg-node-title-active { color: #111827; }
        .mg-node-desc { font-size: 11px; margin-top: 1px; }
        .mg-node-desc-idle { color: #d1d5db; }
        .mg-node-desc-done { color: #9ca3af; }
        .mg-node-desc-active { color: #6b7280; }
        .mg-connector { margin-left: 15px; width: 2px; height: 24px; background: #e5e7eb; position: relative; z-index: 1; }
        .mg-connector-done { background: #2563eb; }
        .mg-sidebar-foot { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f3f4f6; }
        .mg-pct { font-size: 12px; font-weight: 700; color: #2563eb; margin-bottom: 6px; }
        .mg-bar-track { height: 4px; background: #e5e7eb; border-radius: 99px; overflow: hidden; }
        .mg-bar-fill { height: 100%; background: #2563eb; border-radius: 99px; transition: width 0.4s; }
        .mg-main { padding: 44px 52px 80px; overflow-y: auto; }
        @media (max-width: 1100px) { .mg-main { padding: 32px 28px 60px; } }
        .mg-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
        .mg-header-eyebrow { display: inline-flex; align-items: center; gap: 5px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563eb; margin-bottom: 10px; }
        .mg-header-title { font-size: 34px; font-weight: 800; color: #111827; letter-spacing: -0.03em; line-height: 1.05; margin: 0 0 5px; }
        .mg-header-desc { font-size: 13px; color: #9ca3af; font-weight: 500; margin: 0; }
        .mg-header-icon { width: 54px; height: 54px; border-radius: 16px; background: #eff6ff; border: 1px solid #dbeafe; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mg-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03); }
        .mg-card-top-bar { height: 3px; background: linear-gradient(90deg, #2563eb 0%, #93c5fd 100%); }
        .mg-card-body { padding: 26px 28px; }
        .mg-nav { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }
        .mg-dots { display: flex; align-items: center; gap: 5px; }
        .mg-dot { height: 5px; border-radius: 99px; transition: all 0.25s; }
        .mg-dot-active { width: 20px; background: #2563eb; }
        .mg-dot-done { width: 5px; background: #bfdbfe; }
        .mg-dot-idle { width: 5px; background: #e5e7eb; }
        .mg-btn { display: inline-flex; align-items: center; gap: 7px; border-radius: 10px; padding: 11px 20px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: none; letter-spacing: 0.01em; }
        .mg-btn-ghost { background: #fff; border: 1.5px solid #e5e7eb !important; color: #4b5563; }
        .mg-btn-ghost:hover:not(:disabled) { border-color: #d1d5db !important; color: #111827; }
        .mg-btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }
        .mg-btn-solid { background: #2563eb; color: #fff; }
        .mg-btn-solid:hover:not(:disabled) { background: #1d4ed8; }
        .mg-btn-solid:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>

      <div className="mg">
        <Header minimal />

        <div className="mg-layout">
          <aside className="mg-sidebar">
            <div className="mg-brand">
              <div className="mg-brand-pill"><Sparkles size={10} />Mini Game 1</div>
              <h1 className="mg-brand-title">ROOTS<br /><span> &amp; ROUTES</span></h1>
              <div className="mg-brand-sub"><Route size={12} />{STORY_TITLE}</div>
            </div>

            <div className="mg-roadmap">
              <div className="mg-roadmap-line">
                <div className="mg-roadmap-line-fill" style={{ height: `${(stepIndex / (STEPS.length - 1)) * 100}%` }} />
              </div>

              <div className="mg-roadmap-items">
                {STEPS.map((s, idx) => {
                  const Icon = s.Icon;
                  const state = idx === stepIndex ? 'active' : idx < stepIndex ? 'done' : 'idle';
                  const isLast = idx === STEPS.length - 1;
                  return (
                    <div key={idx}>
                      <div className="mg-roadmap-item">
                        <div className={`mg-node mg-node-${state}`}>
                          {state === 'done'
                            ? <CheckCircle2 size={14} color="#2563eb" />
                            : <Icon size={14} color={state === 'active' ? '#fff' : '#d1d5db'} />
                          }
                        </div>
                        <div className="mg-node-body">
                          <div className={`mg-node-title mg-node-title-${state}`}>{s.title}</div>
                          <div className={`mg-node-desc mg-node-desc-${state}`}>{s.desc}</div>
                        </div>
                      </div>
                      {!isLast && (
                        <div className={`mg-connector ${idx < stepIndex ? 'mg-connector-done' : ''}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mg-sidebar-foot">
              <div className="mg-pct">{Math.round((stepIndex / (STEPS.length - 1)) * 100)}% complete</div>
              <div className="mg-bar-track">
                <div className="mg-bar-fill" style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }} />
              </div>
            </div>
          </aside>

          <main className="mg-main">
            <div className="mg-header">
              <div className="mg-header-left">
                <div className="mg-header-eyebrow"><StepIcon size={11} />Step {stepIndex + 1} of {STEPS.length}</div>
                <h2 className="mg-header-title">{step.title}</h2>
                <p className="mg-header-desc">
                  {stepIndex === 0 && 'Read the mission briefing before proceeding'}
                  {stepIndex === 1 && 'Study the civilization-to-piece key card'}
                  {stepIndex === 2 && 'The Route_Code is encrypted'}
                  {stepIndex === 3 && 'Get to Decrypting (try different Ciphers)'}
                  {stepIndex === 4 && 'Drag and match each variant to its civilization and piece'}
                  {stepIndex === 5 && 'Order the four pieces by standard chess value, highest first'}
                  {stepIndex === 6 && 'Identify the lost artifact and submit your answer'}
                </p>
              </div>
              <div className="mg-header-icon">
                <StepIcon size={26} color="#2563eb" />
              </div>
            </div>

            <div className="mg-card">
              <div className="mg-card-top-bar" />
              <div className="mg-card-body">
                {renderStep()}
              </div>
            </div>

            <div className="mg-nav">
              <button className="mg-btn mg-btn-ghost" onClick={() => go(stepIndex - 1)} disabled={stepIndex === 0}>
                <ArrowLeft size={14} />Back
              </button>
              <div className="mg-dots">
                {STEPS.map((_, idx) => (
                  <div key={idx} className={`mg-dot ${idx === stepIndex ? 'mg-dot-active' : idx < stepIndex ? 'mg-dot-done' : 'mg-dot-idle'}`} />
                ))}
              </div>
              <button className="mg-btn mg-btn-solid" onClick={() => go(stepIndex + 1)} disabled={stepIndex >= STEPS.length - 1 || nextDisabled}>
                Next<ArrowRight size={14} />
              </button>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
