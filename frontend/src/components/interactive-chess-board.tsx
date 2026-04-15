import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGame } from '@/context/game-context';

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

const BOARD_COLORS = {
  light: '#f0d9b5',
  dark: '#b58863',
  lastFrom: '#c9d77e',
  lastTo: '#a7c168',
  check: '#e86060',
  checkmateWin: '#9be7a3',
  checkmateLose: '#fca5a5',
  selected: '#f6f669',
};

const POWER_BUTTONS = [
  {
    key: 'convert',
    label: 'Buddhist Monk',
    description: 'Convert: move as bishop, convert adjacent enemy pawns (once per game).',
    piece: 'B',
    color: 'bg-red-500',
  },
  {
    key: 'leap',
    label: 'Sikh Warrior',
    description: 'Leap: jump over one adjacent friendly piece to the opposite square (once per game).',
    piece: 'N',
    color: 'bg-purple-500',
  },
  {
    key: 'trade',
    label: 'Parsi Merchant',
    description: 'Trade: swap with any adjacent friendly piece (once per game).',
    piece: 'R',
    color: 'bg-orange-500',
  },
  {
    key: 'resurrection',
    label: 'Christian/Nasrani Keeper',
    description: 'Resurrection: if your keeper was captured, click to respawn on d1/d8 (once per game).',
    piece: 'Q',
    color: 'bg-blue-500',
  },
] as const;

export function InteractiveChessBoard() {
  const {
    gameState,
    chess,
    makeMove,
    selectSquare,
    setLegalMoves,
    decrementTimer,
    setActivePowerMode,
    makeSpecialMove,
    triggerResurrection,
    useHarmonyToken,
  } = useGame();

  const [powerSource, setPowerSource] = useState<string | null>(null);
  const [animatedMove, setAnimatedMove] = useState<{ from: string; to: string; id: number } | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'start' | 'end'>('start');
  const [squareSize, setSquareSize] = useState(0);
  const animationIdRef = useRef(0);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (gameState.gameOver || !gameState.gameStarted) {
      return;
    }

    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [decrementTimer, gameState.gameOver, gameState.gameStarted]);

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
    if (!gameState.lastMove) return;
    const id = animationIdRef.current + 1;
    animationIdRef.current = id;
    setAnimatedMove({ ...gameState.lastMove, id });
  }, [gameState.lastMove?.from, gameState.lastMove?.to]);

  useEffect(() => {
    if (!animatedMove) return;
    setAnimationPhase('start');
    const frame = requestAnimationFrame(() => setAnimationPhase('end'));
    const timeout = setTimeout(() => {
      setAnimatedMove((prev) => (prev?.id === animatedMove.id ? null : prev));
    }, 180);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [animatedMove]);

  const isFlipped = gameState.onlineMatch && gameState.localPlayerColor === 'b';
  const files = isFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = isFlipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];

  const toGrid = (sq: string) => ({
    x: files.indexOf(sq[0]),
    y: ranks.indexOf(sq[1]),
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

  const boardTurn = chess.turn() as 'w' | 'b';
  const canActThisTurn = !gameState.onlineMatch || !gameState.localPlayerColor || boardTurn === gameState.localPlayerColor;
  const showHarmonyPanel =
    gameState.format === 'knockout' &&
    canActThisTurn &&
    gameState.gameStarted &&
    !gameState.gameOver &&
    (!gameState.localPlayerColor || gameState.localPlayerColor === boardTurn);
  const currentPowerState = boardTurn === 'w' ? gameState.usedPowers.white : gameState.usedPowers.black;

  const isCheck = chess.isCheck();
  const isCheckmate = chess.isCheckmate();
  const losingKingColor = isCheckmate ? (chess.turn() as 'w' | 'b') : null;
  const winningKingColor = isCheckmate ? (losingKingColor === 'w' ? 'b' : 'w') : null;

  const resurrectionAvailable = useMemo(() => {
    if (gameState.format !== 'powers' || currentPowerState.resurrection) {
      return false;
    }
    const hasQueen = chess.board().some((rank) => rank.some((piece) => piece?.type === 'q' && piece.color === boardTurn));
    return !hasQueen;
  }, [boardTurn, chess, currentPowerState.resurrection, gameState.format]);

  const toCoords = (square: string) => ({ file: square.charCodeAt(0) - 97, rank: Number.parseInt(square[1], 10) - 1 });
  const toSquare = (file: number, rank: number) => `${String.fromCharCode(97 + file)}${rank + 1}`;
  const inBounds = (file: number, rank: number) => file >= 0 && file < 8 && rank >= 0 && rank < 8;

  const advanceFenTurnAfterTrade = (fen: string, moverColor: 'w' | 'b', from: string) => {
    const parts = fen.split(' ');
    if (parts.length < 6) {
      return fen;
    }

    let castling = parts[2] === '-' ? '' : parts[2];
    const removeRight = (ch: string) => {
      castling = castling.replace(ch, '');
    };

    if (moverColor === 'w') {
      if (from === 'a1') removeRight('Q');
      if (from === 'h1') removeRight('K');
    } else {
      if (from === 'a8') removeRight('q');
      if (from === 'h8') removeRight('k');
    }

    parts[2] = castling || '-';
    parts[1] = moverColor === 'w' ? 'b' : 'w';
    parts[3] = '-';

    const halfmove = Number.parseInt(parts[4], 10);
    parts[4] = Number.isFinite(halfmove) ? String(halfmove + 1) : '1';

    const fullmove = Number.parseInt(parts[5], 10);
    parts[5] = Number.isFinite(fullmove)
      ? String(moverColor === 'b' ? fullmove + 1 : fullmove)
      : moverColor === 'b'
        ? '2'
        : '1';

    return parts.join(' ');
  };

  const canExecuteTrade = (from: string, to: string, color: 'w' | 'b') => {
    try {
      const fromC = toCoords(from);
      const toC = toCoords(to);
      const distance = Math.max(Math.abs(fromC.file - toC.file), Math.abs(fromC.rank - toC.rank));
      if (distance !== 1) {
        return false;
      }

      const nextChess = new Chess(chess.fen());
      const rookPiece = nextChess.get(from as Square);
      const targetPiece = nextChess.get(to as Square);
      if (!rookPiece || rookPiece.type !== 'r' || rookPiece.color !== color) {
        return false;
      }
      if (!targetPiece || targetPiece.color !== color) {
        return false;
      }

      nextChess.remove(from as Square);
      nextChess.remove(to as Square);
      nextChess.put({ type: targetPiece.type, color }, from as Square);
      nextChess.put({ type: 'r', color }, to as Square);

      const nextFen = advanceFenTurnAfterTrade(nextChess.fen(), color, from);
      nextChess.load(nextFen);
      return true;
    } catch {
      return false;
    }
  };

  const getLeapTargets = (from: string, color: 'w' | 'b') => {
    const { file, rank } = toCoords(from);
    const targets: string[] = [];
    for (let df = -1; df <= 1; df += 1) {
      for (let dr = -1; dr <= 1; dr += 1) {
        if (df === 0 && dr === 0) continue;
        const midF = file + df;
        const midR = rank + dr;
        const dstF = file + df * 2;
        const dstR = rank + dr * 2;
        if (!inBounds(midF, midR) || !inBounds(dstF, dstR)) continue;
        const midSq = toSquare(midF, midR) as Square;
        const dstSq = toSquare(dstF, dstR) as Square;
        const midPiece = chess.get(midSq);
        if (!midPiece || midPiece.color !== color) continue;
        const dstPiece = chess.get(dstSq);
        if (!dstPiece || dstPiece.color !== color) {
          targets.push(dstSq);
        }
      }
    }
    return targets;
  };

  const getTradeTargets = (from: string, color: 'w' | 'b') => {
    const { file, rank } = toCoords(from);
    const targets: string[] = [];
    for (let df = -1; df <= 1; df += 1) {
      for (let dr = -1; dr <= 1; dr += 1) {
        if (df === 0 && dr === 0) continue;
        const nf = file + df;
        const nr = rank + dr;
        if (!inBounds(nf, nr)) continue;
        const sq = toSquare(nf, nr) as Square;
        const p = chess.get(sq);
        if (p && p.color === color && canExecuteTrade(from, sq, color)) {
          targets.push(sq);
        }
      }
    }
    return targets;
  };

  const setPowerSourceAndTargets = (mode: string, square: string, color: 'w' | 'b') => {
    setPowerSource(square);
    selectSquare(square);
    if (mode === 'convert') {
      const legal = chess
        .moves({ square: square as Square, verbose: true })
        .filter((move) => move.piece === 'b')
        .map((move) => move.to);
      setLegalMoves(legal);
      return;
    }
    if (mode === 'leap') {
      setLegalMoves(getLeapTargets(square, color));
      return;
    }
    if (mode === 'trade') {
      setLegalMoves(getTradeTargets(square, color));
    }
  };

  const handlePowerClick = (powerType: string) => {
    if (!canActThisTurn || gameState.gameOver) {
      return;
    }

    if (powerType === 'resurrection') {
      const ok = triggerResurrection(boardTurn, true);
      if (ok) {
        setActivePowerMode(null);
        setPowerSource(null);
        selectSquare(null);
        setLegalMoves([]);
      }
      return;
    }

    if (gameState.activePowerMode === powerType) {
      setActivePowerMode(null);
      setPowerSource(null);
      selectSquare(null);
      setLegalMoves([]);
      return;
    }

    setActivePowerMode(powerType);
    setPowerSource(null);
    selectSquare(null);
    setLegalMoves([]);
  };

  const handleSquareClick = (square: string) => {
    if (gameState.gameOver || !canActThisTurn) {
      return;
    }

    const piece = chess.get(square as Square);

    if (gameState.activePowerMode) {
      const mode = gameState.activePowerMode;

      if (!powerSource) {
        if (!piece || piece.color !== boardTurn) {
          return;
        }

        if (mode === 'convert' && piece.type === 'b') {
          setPowerSourceAndTargets(mode, square, piece.color);
        }
        if (mode === 'leap' && piece.type === 'n') {
          setPowerSourceAndTargets(mode, square, piece.color);
        }
        if (mode === 'trade' && piece.type === 'r') {
          setPowerSourceAndTargets(mode, square, piece.color);
        }
        return;
      }

      if (gameState.legalMoves.includes(square)) {
        const ok = makeSpecialMove(mode, powerSource, square);
        if (ok) {
          setActivePowerMode(null);
          setPowerSource(null);
          selectSquare(null);
          setLegalMoves([]);
        }
        return;
      }

      if (piece && piece.color === boardTurn) {
        if (mode === 'convert' && piece.type === 'b') {
          setPowerSourceAndTargets(mode, square, piece.color);
          return;
        }
        if (mode === 'leap' && piece.type === 'n') {
          setPowerSourceAndTargets(mode, square, piece.color);
          return;
        }
        if (mode === 'trade' && piece.type === 'r') {
          setPowerSourceAndTargets(mode, square, piece.color);
          return;
        }
      }

      const ok = makeSpecialMove(mode, powerSource, square);
      if (ok) {
        setActivePowerMode(null);
        setPowerSource(null);
        selectSquare(null);
        setLegalMoves([]);
      }
      return;
    }

    if (gameState.legalMoves.includes(square) && gameState.selectedSquare) {
      makeMove(gameState.selectedSquare, square);
      selectSquare(null);
      setLegalMoves([]);
      return;
    }

    if (piece && piece.color === boardTurn) {
      selectSquare(square);
      const legal = chess.moves({ square: square as Square, verbose: true }).map((move) => move.to);
      setLegalMoves(legal);
    } else {
      selectSquare(null);
      setLegalMoves([]);
    }
  };

  const squares = useMemo(() => {
    const all: Array<{ square: string; file: string; rank: string }> = [];
    for (const rank of ranks) {
      for (const file of files) {
        all.push({ square: `${file}${rank}`, file, rank });
      }
    }
    return all;
  }, [files, ranks]);

  return (
    <div className="flex w-full items-start justify-center gap-5 px-2 py-1">
      {(gameState.format === 'powers' || gameState.format === 'knockout') && (
        <div className="self-center flex min-w-[84px] flex-col items-center justify-center gap-5">
          {gameState.format === 'powers' && (
            <TooltipProvider>
              {POWER_BUTTONS.map((power) => {
                const used = currentPowerState[power.key as keyof typeof currentPowerState];
                const active = gameState.activePowerMode === power.key;
                const resurrectionDisabled = power.key === 'resurrection' && (!resurrectionAvailable || used);
                return (
                  <Tooltip key={power.key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handlePowerClick(power.key)}
                        disabled={gameState.gameOver || !canActThisTurn || (power.key !== 'resurrection' && used) || resurrectionDisabled}
                        className={`h-14 w-14 rounded-full text-3xl text-white shadow-[0_4px_10px_rgba(0,0,0,0.4)] transition flex items-center justify-center ${power.color} ${
                          active ? 'ring-4 ring-[#f7ec74] outline outline-2 outline-[#4b4845]' : ''
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <img
                          src={PIECE_IMAGES[power.piece]}
                          alt={power.label}
                          className="h-8 w-8 object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
                          draggable={false}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[260px] border border-slate-200 bg-white text-black shadow-lg">
                      <p className="font-semibold">{power.label}</p>
                      <p className="text-sm text-black/85">{power.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          )}

          {showHarmonyPanel && (
            <div className="rounded-xl border border-[#4b4845] bg-[#312e2b] p-2 text-white shadow-[0_8px_22px_rgba(0,0,0,0.45)]">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-[#d9b36a]">Harmony</p>
              <button
                type="button"
                onClick={() => useHarmonyToken('w')}
                disabled={gameState.gameOver || !canActThisTurn || gameState.localPlayerColor !== 'w' || gameState.whiteHarmonyTokens <= 0}
                className="mb-2 w-full rounded-md bg-blue-500 px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
              >
                White {gameState.whiteHarmonyTokens}/3
              </button>
              <button
                type="button"
                onClick={() => useHarmonyToken('b')}
                disabled={gameState.gameOver || !canActThisTurn || gameState.localPlayerColor !== 'b' || gameState.blackHarmonyTokens <= 0}
                className="w-full rounded-md bg-slate-700 px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
              >
                Black {gameState.blackHarmonyTokens}/3
              </button>
            </div>
          )}
        </div>
      )}

      <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
        <div
          ref={boardRef}
          className="grid w-[min(72vh,92vw,820px)] grid-cols-8 overflow-hidden rounded-lg border border-slate-300"
        >
          {squares.map(({ square, file, rank }) => {
            const piece = chess.get(square as Square);
            const isLight = (file.charCodeAt(0) - 97 + Number.parseInt(rank, 10)) % 2 === 0;
            const isSelected = gameState.selectedSquare === square;
            const isLegalMove = gameState.legalMoves.includes(square);
            const isLastFrom = gameState.lastMove?.from === square;
            const isLastTo = gameState.lastMove?.to === square;

            let squareBg = isLight ? BOARD_COLORS.light : BOARD_COLORS.dark;
            if (isLastFrom) squareBg = BOARD_COLORS.lastFrom;
            if (isLastTo) squareBg = BOARD_COLORS.lastTo;
            if (isSelected) squareBg = BOARD_COLORS.selected;

            if (piece?.type === 'k') {
              if (isCheckmate && piece.color === winningKingColor) {
                squareBg = BOARD_COLORS.checkmateWin;
              } else if (isCheckmate && piece.color === losingKingColor) {
                squareBg = BOARD_COLORS.checkmateLose;
              } else if (isCheck && piece.color === boardTurn) {
                squareBg = BOARD_COLORS.check;
              }
            }

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
                {isLegalMove && !piece && <span className="absolute h-4 w-4 rounded-full bg-black/20" />}
                {isLegalMove && piece && <span className="absolute inset-1 rounded-full border-[3px] border-black/20" />}
                {piece && (() => {
                  const shouldAnimate = animatedMove && animatedMove.to === square;
                  const offset = shouldAnimate ? getOffset(animatedMove.from, animatedMove.to) : { dx: 0, dy: 0 };
                  const pieceStyle = shouldAnimate
                    ? {
                        transform: animationPhase === 'start' ? `translate(${offset.dx}px, ${offset.dy}px)` : 'translate(0, 0)',
                        transition: 'transform 180ms ease-out',
                        willChange: 'transform',
                      }
                    : undefined;
                  return (
                    <img
                      src={PIECE_IMAGES[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                      alt={piece.type}
                      style={pieceStyle}
                      className="h-[84%] w-[84%] object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
                      draggable={false}
                    />
                  );
                })()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

