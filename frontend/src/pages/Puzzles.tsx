import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { useNavigate } from 'react-router-dom';

import { Check } from 'lucide-react';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { submitPuzzleResult } from '@/lib/api';

const PIECE_IMAGES: Record<string, string> = {
  K: '/pieces/sketch/wK.svg',
  Q: '/pieces/sketch/wQ.svg',
  R: '/pieces/sketch/wR.svg',
  B: '/pieces/sketch/wB.svg',
  N: '/pieces/sketch/wN.svg',
  P: '/pieces/sketch/wP.svg',
  k: '/pieces/sketch/bK.svg',
  q: '/pieces/sketch/bQ.svg',
  r: '/pieces/sketch/bR.svg',
  b: '/pieces/sketch/bB.svg',
  n: '/pieces/sketch/bN.svg',
  p: '/pieces/sketch/bP.svg',
};

type PuzzleMove = {
  color: 'w' | 'b';
  from: string;
  to: string;
  notation: string;
  piece?: string;
  isMate?: boolean;
  mateKingSquare?: string;
};

type PuzzleDefinition = {
  id: string;
  title: string;
  fen: string;
  moves: PuzzleMove[];
  mateKingSquare?: string;
};

const PUZZLES: PuzzleDefinition[] = [
  {
    id: 'mate-in-1',
    title: 'Check in 1',
    fen: '1rkr4/p6p/7Q/3p1p2/PP1Pp2p/K7/3B4/8 w - - 0 1',
    moves: [
      { color: 'w', from: 'h6', to: 'c6', notation: 'Qc6+', mateKingSquare: 'c8' },
    ],
    mateKingSquare: 'c8',
  },
  {
    id: 'mate-in-2',
    title: 'Check in 2',
    fen: 'r5r1/pp4k1/3Q3p/2pP4/2P5/3B4/P3KP1P/2q5 w - - 0 1',
    moves: [
      { color: 'w', from: 'd6', to: 'e7', notation: 'Qe7+' },
      { color: 'b', from: 'g7', to: 'h8', notation: 'Kh8', piece: 'k' },
      { color: 'w', from: 'e7', to: 'h7', notation: 'Qh7#', isMate: true, mateKingSquare: 'h8' },
    ],
    mateKingSquare: 'h8',
  },
  {
    id: 'mate-in-3',
    title: 'Check in 3',
    fen: '2Rn1r2/r2qbpk1/4p2p/2p1N3/P1b5/P1N1P2P/2Q3P1/5RK1 w - - 0 1',
    moves: [
      { color: 'w', from: 'f1', to: 'f7', notation: 'Rxf7+' },
      { color: 'b', from: 'd8', to: 'f7', notation: 'Nxf7', piece: 'n' },
      { color: 'w', from: 'c2', to: 'g6', notation: 'Qg6+' },
      { color: 'b', from: 'g7', to: 'h8', notation: 'Kh8', piece: 'k' },
      { color: 'w', from: 'e5', to: 'f7', notation: 'Nxf7#', piece: 'n', isMate: true, mateKingSquare: 'h8' },
    ],
    mateKingSquare: 'h8',
  },
];

const ATTEMPTS_PER_PUZZLE = 3;
const BOARD_COLORS = {
  light: '#f0d9b5',
  dark: '#b58863',
  lastFrom: '#c9d77e',
  lastTo: '#a7c168',
  correctTick: '#38b26e',
  wrong: '#f4a1a1',
  mate: '#e86060',
};

export default function PuzzlesPage() {
  const navigate = useNavigate();
  const [currentPuzzle, setCurrentPuzzle] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(ATTEMPTS_PER_PUZZLE);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<{ square: string; color: 'correct' | 'wrong' } | null>(null);
  const [mateSquare, setMateSquare] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [lastCorrectMove, setLastCorrectMove] = useState<{ from: string; to: string } | null>(null);
  const [animatedMove, setAnimatedMove] = useState<{ from: string; to: string; id: number } | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'start' | 'end'>('start');
  const [squareSize, setSquareSize] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  const chessRef = useRef(new Chess(PUZZLES[0].fen));
  const submittedRef = useRef(false);
  const animationIdRef = useRef(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const completionKey = 'mini_game_2_completed';

  const player = useMemo(() => {
    const teamName = sessionStorage.getItem('team_name') || localStorage.getItem('team_name');
    const passcode = sessionStorage.getItem('passcode') || localStorage.getItem('passcode');
    const rawNum = sessionStorage.getItem('player_number') || localStorage.getItem('player_number');
    const playerNumber = rawNum === '1' ? 1 : rawNum === '2' ? 2 : rawNum === 'team' ? 'team' : null;
    if (!teamName || !passcode) return null;
    return { id: teamName, passcode, playerNumber };
  }, []);

  useEffect(() => {
    if (!player?.id || !player?.passcode) {
      navigate('/game');
    }
  }, [navigate, player]);

  useEffect(() => {
    if (sessionStorage.getItem(completionKey) === 'true') {
      navigate('/game');
    }
  }, [navigate]);

  useEffect(() => {
    const updateSize = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      setSquareSize(rect.width / 8);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!animatedMove) return;
    setAnimationPhase('start');
    const frame = requestAnimationFrame(() => setAnimationPhase('end'));
    const timeout = setTimeout(() => {
      setAnimatedMove((prev) => (prev?.id === animatedMove.id ? null : prev));
    }, 220);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [animatedMove]);

  useEffect(() => {
    const puzzle = PUZZLES[currentPuzzle];
    chessRef.current = new Chess(puzzle.fen);
    setCurrentMoveIndex(0);
    setAttemptsLeft(ATTEMPTS_PER_PUZZLE);
    setSelectedSquare(null);
    setLegalMoves([]);
    setMoveHistory([]);
    setHighlight(null);
    setMateSquare(null);
    setLastMove(null);
    setLastCorrectMove(null);
    setAnimatedMove(null);
  }, [currentPuzzle]);

  const applyMove = (from: string, to: string, pieceOverride?: string, moveColor?: 'w' | 'b') => {
    const chess = chessRef.current;
    const move = chess.move({ from: from as Square, to: to as Square, promotion: 'q' });
    if (!move) {
      let piece = chess.get(from as Square);
      let movedManually = false;
      if (!piece && pieceOverride) {
        const inferredColor = moveColor ?? 'w';
        chess.put({ type: pieceOverride.toLowerCase() as any, color: inferredColor }, from as Square);
        piece = chess.get(from as Square);
      }
      if (piece) {
        chess.remove(from as Square);
        chess.remove(to as Square);
        chess.put(piece, to as Square);
        movedManually = true;
      }
      if (movedManually) {
        const fen = chess.fen();
        const parts = fen.split(' ');
        if (parts.length >= 6) {
          const nextTurn = moveColor ? (moveColor === 'w' ? 'b' : 'w') : (parts[1] === 'w' ? 'b' : 'w');
          parts[1] = nextTurn;
          parts[3] = '-';
          parts[4] = '0';
          chess.load(parts.join(' '));
        }
      }
    }
    setLastMove({ from, to });
    const id = animationIdRef.current + 1;
    animationIdRef.current = id;
    setAnimatedMove({ from, to, id });
  };

  const applyAutoMoves = async (startIndex: number) => {
    const puzzle = PUZZLES[currentPuzzle];
    let index = startIndex;
    while (index < puzzle.moves.length && puzzle.moves[index].color === 'b') {
      const move = puzzle.moves[index];
      applyMove(move.from, move.to, move.piece, move.color);
      setMoveHistory((prev) => [...prev, move.notation]);
      index += 1;
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    setCurrentMoveIndex(index);
    return index;
  };

  const advancePuzzle = (solved: boolean) => {
    const updatedCorrect = solved ? correctCount + 1 : correctCount;
    if (solved) {
      setCorrectCount(updatedCorrect);
    }
    if (currentPuzzle >= PUZZLES.length - 1) {
      finishSession(updatedCorrect);
      return;
    }
    setTimeout(() => {
      setCurrentPuzzle((prev) => prev + 1);
    }, 900);
  };

  const finishSession = (finalCorrect?: number) => {
    if (summaryOpen) return;
    const finalCount = typeof finalCorrect === 'number' ? finalCorrect : correctCount;
    const points = finalCount === PUZZLES.length ? 2 : 0;
    const summary = `You solved ${finalCount} of ${PUZZLES.length} puzzles. Harmony Points earned: ${points}.`;
    setSummaryText(summary);
    setSummaryOpen(true);
    sessionStorage.setItem(completionKey, 'true');

    if (submittedRef.current || !player?.id || !player?.passcode) {
      return;
    }
    submittedRef.current = true;
    submitPuzzleResult({
      team_name: player.id,
      passcode: player.passcode,
      puzzles_correct: finalCount,
      total_puzzles: PUZZLES.length,
      points_earned: points,
      player_number: player.playerNumber === 1 ? 1 : player.playerNumber === 2 ? 2 : 'team',
    }).catch(() => undefined);
  };

  const handleSquareClick = async (square: string) => {
    if (summaryOpen) return;

    const puzzle = PUZZLES[currentPuzzle];
    const expected = puzzle.moves[currentMoveIndex];
    const chess = chessRef.current;

    const piece = chess.get(square as Square);
    if (!selectedSquare) {
      if (!piece || piece.color !== 'w') {
        return;
      }
      setSelectedSquare(square);
      const moves = chess.moves({ square: square as Square, verbose: true }).map((move) => move.to);
      setLegalMoves(moves);
      return;
    }

    if (!expected || expected.color !== 'w') {
      return;
    }

    const from = selectedSquare;
    const to = square;
    setSelectedSquare(null);
    setLegalMoves([]);

    if (from === expected.from && to === expected.to) {
      applyMove(from, to);
      setMoveHistory((prev) => [...prev, expected.notation]);
      setHighlight(null);
      setLastCorrectMove({ from, to });
      if (expected.isMate) {
        setMateSquare(expected.mateKingSquare || puzzle.mateKingSquare || null);
      }
      const nextIndex = currentMoveIndex + 1;
      const finalIndex = await applyAutoMoves(nextIndex);

      if (finalIndex >= puzzle.moves.length) {
        advancePuzzle(true);
      }
      return;
    }

    setHighlight({ square: from, color: 'wrong' });
    setLastCorrectMove(null);
    const nextAttempts = attemptsLeft - 1;
    setAttemptsLeft(nextAttempts);
    if (nextAttempts <= 0) {
      advancePuzzle(false);
    }
  };

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  const toGrid = (sq: string) => ({
    x: sq.charCodeAt(0) - 97,
    y: 8 - Number.parseInt(sq[1], 10),
  });

  const getOffset = (from: string, to: string) => {
    if (!squareSize) return { dx: 0, dy: 0 };
    const start = toGrid(from);
    const end = toGrid(to);
    return {
      dx: (start.x - end.x) * squareSize,
      dy: (start.y - end.y) * squareSize,
    };
  };

  const squares = useMemo(() => {
    const all: Array<{ square: string; file: string; rank: string }> = [];
    for (const rank of ranks) {
      for (const file of files) {
        all.push({ square: `${file}${rank}`, file, rank });
      }
    }
    return all;
  }, []);

  const puzzle = PUZZLES[currentPuzzle];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1 flex justify-center p-4 md:p-6">
        <div className="flex w-full max-w-[1850px] flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-3 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h1 className="text-2xl font-semibold">Harmony Puzzles</h1>
              <p className="text-sm text-slate-600">{puzzle.title} ? Attempt {currentPuzzle + 1} of {PUZZLES.length}</p>
              <p className="text-xs text-slate-500 mt-1">Attempts left for this puzzle: {attemptsLeft}</p>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex w-full justify-center p-2">
                <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                  <div
                    ref={boardRef}
                    className="grid w-[min(72vh,92vw,820px)] grid-cols-8 overflow-hidden rounded-lg border border-slate-300"
                  >
                    {squares.map(({ square, file, rank }) => {
                      const piece = chessRef.current.get(square as Square);
                      const isLight = (file.charCodeAt(0) - 97 + Number.parseInt(rank, 10)) % 2 === 0;
                      const isSelected = selectedSquare === square;
                      const isLegalMove = legalMoves.includes(square);
                      const isLastFrom = lastMove?.from === square;
                      const isLastTo = lastMove?.to === square;
                      const isCorrectTo = lastCorrectMove?.to === square;

                      let squareBg = isLight ? BOARD_COLORS.light : BOARD_COLORS.dark;
                      if (isLastFrom) squareBg = BOARD_COLORS.lastFrom;
                      if (isLastTo) squareBg = BOARD_COLORS.lastTo;
                      if (isSelected) squareBg = '#f6f669';
                      if (highlight?.square === square && highlight.color === 'wrong') {
                        squareBg = BOARD_COLORS.wrong;
                      }
                      if (mateSquare === square) {
                        squareBg = BOARD_COLORS.mate;
                      }

                      const shouldAnimate = animatedMove && animatedMove.to === square && piece;
                      const offset = shouldAnimate ? getOffset(animatedMove.from, animatedMove.to) : { dx: 0, dy: 0 };
                      const pieceStyle = shouldAnimate
                        ? {
                            transform: animationPhase === 'start' ? `translate(${offset.dx}px, ${offset.dy}px)` : 'translate(0, 0)',
                            transition: 'transform 180ms ease-out',
                            willChange: 'transform',
                          }
                        : undefined;

                      return (
                        <button
                          key={square}
                          type="button"
                          onClick={() => handleSquareClick(square)}
                          style={{ backgroundColor: squareBg }}
                          className="relative aspect-square flex items-center justify-center text-[clamp(1.45rem,3.8vw,3.15rem)] font-bold leading-none transition-colors"
                        >
                          <span
                            className={`pointer-events-none absolute ${
                              isLight ? 'right-[6%] top-[5%] text-[#80654f]' : 'right-[6%] top-[5%] text-[#f8f0e6]'
                            } text-[10px] font-semibold opacity-90`}
                          >
                            {file === files[files.length - 1] ? rank : ''}
                          </span>
                          <span
                            className={`pointer-events-none absolute ${
                              isLight ? 'bottom-[4%] left-[6%] text-[#80654f]' : 'bottom-[4%] left-[6%] text-[#f8f0e6]'
                            } text-[10px] font-semibold opacity-90`}
                          >
                            {rank === ranks[ranks.length - 1] ? file : ''}
                          </span>
                          {isLegalMove && !piece && (
                            <span className="absolute h-4 w-4 rounded-full bg-black/20" />
                          )}
                          {isLegalMove && piece && (
                            <span className="absolute inset-1 rounded-full border-[3px] border-black/20" />
                          )}
                          {isCorrectTo && (
                            <span
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow"
                              style={{ color: BOARD_COLORS.correctTick }}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                          {piece && (
                            <img
                              src={PIECE_IMAGES[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                              alt={piece.type}
                              style={pieceStyle}
                              className="h-[84%] w-[84%] object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
                              draggable={false}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:w-80">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1 w-full bg-gradient-to-r from-blue-600 to-blue-400" />
              <div className="flex items-center justify-between border-b p-3">
                <h3 className="text-sm font-semibold text-blue-600">Move History</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{moveHistory.length} moves</span>
              </div>
              <div className="h-[360px] overflow-auto p-2 text-sm">
                {moveHistory.length === 0 && <p className="text-xs text-slate-500">No moves yet.</p>}
                {moveHistory.map((move, index) => (
                  <div key={`${move}-${index}`} className="flex items-center justify-between py-1">
                    <span>{index + 1}.</span>
                    <span className="font-semibold">{move}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {summaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Puzzle Results</h2>
            <p className="mt-2 text-sm text-slate-700">{summaryText}</p>
            <div className="mt-5 flex justify-end">
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate('/game')}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








