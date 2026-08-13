import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Home,
  RotateCcw,
  Settings,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameLogo } from "@/components/GameLogo";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useSoundPreference } from "@/hooks/use-sound-preference";
import {
  findKing,
  generateLegalMoves,
  getStatus,
  indexToSquare,
  initialState,
  makeMove,
  PIECE_GLYPHS,
  squareIndex,
  type GameState,
  type Move,
  type Piece,
  type PieceType,
} from "@/lib/chess";
import { getSoundOn } from "@/lib/game-storage";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

type MoveRecord = { state: GameState; move: Move | null; captured: Piece | null };

function getCaptured(state: GameState, move: Move): Piece | null {
  const to = squareIndex(move.to);
  const p = state.board[to];
  if (p) return p;
  if (move.to === state.enPassant) {
    const idx = to + (state.turn === "w" ? 8 : -8);
    return state.board[idx];
  }
  return null;
}

function PieceGlyph({
  piece,
  className,
}: {
  piece: Piece;
  className?: string;
}) {
  return (
    <span
      className={cn("font-serif leading-none select-none", className)}
      style={{
        color: piece.color === "w" ? "#fff9ec" : "#2b2620",
        textShadow:
          piece.color === "w"
            ? "0 1px 2px rgba(43,38,32,0.9), 0 0 1px rgba(43,38,32,0.95)"
            : "0 1px 2px rgba(43,38,32,0.35)",
      }}
    >
      {PIECE_GLYPHS[piece.color + piece.type.toUpperCase()]}
    </span>
  );
}

const LIGHT_SQ = "#f6e3c5";
const DARK_SQ = "#c1864b";

const PROMO_PIECES: PieceType[] = ["q", "r", "b", "n"];

export default function Chess() {
  const { soundOn, toggleSound } = useSoundPreference();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState<MoveRecord[]>([
    { state: initialState(), move: null, captured: null },
  ]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const current = history[history.length - 1].state;
  const status = useMemo(() => getStatus(current), [current]);
  const legalMoves = useMemo(() => generateLegalMoves(current), [current]);
  const movesFromSelected = useMemo(
    () => (selected ? legalMoves.filter((m) => m.from === selected) : []),
    [selected, legalMoves],
  );
  const lastMove = history[history.length - 1].move;
  const over = status.status === "checkmate" || status.status === "stalemate" || status.status === "draw";

  const capturedByWhite = useMemo(
    () => history.flatMap((r) => (r.captured?.color === "b" ? [r.captured] : [])),
    [history],
  );
  const capturedByBlack = useMemo(
    () => history.flatMap((r) => (r.captured?.color === "w" ? [r.captured] : [])),
    [history],
  );
  const moveLog = useMemo(
    () => history.filter((r): r is MoveRecord & { move: Move } => r.move !== null),
    [history],
  );

  const kingInCheck = useMemo(() => {
    if (status.status === "check" || status.status === "checkmate") {
      return indexToSquare(findKing(current.board, current.turn));
    }
    return null;
  }, [current, status.status]);

  // Sounds for check / checkmate transitions.
  useEffect(() => {
    if (status.status === "checkmate" && getSoundOn()) sfx.win();
    else if (status.status === "check" && getSoundOn()) sfx.pause();
  }, [status.status]);

  const applyMove = (move: Move) => {
    const captured = getCaptured(current, move);
    const next = makeMove(current, move);
    setHistory((h) => [...h, { state: next, move, captured }]);
    setSelected(null);
    if (getSoundOn()) sfx.move();
  };

  const handleSquareClick = (sq: string) => {
    if (pendingPromotion || over) return;
    const piece = current.board[squareIndex(sq)];

    if (selected) {
      const move = movesFromSelected.find((m) => m.to === sq);
      if (move) {
        if (move.promotion) {
          setPendingPromotion({ from: move.from, to: move.to });
          setSelected(null);
          if (getSoundOn()) sfx.click();
          return;
        }
        applyMove(move);
        return;
      }
    }

    if (piece && piece.color === current.turn) {
      setSelected(sq);
      if (getSoundOn()) sfx.click();
    } else {
      setSelected(null);
    }
  };

  const undo = () => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
    setSelected(null);
  };

  const newGame = () => {
    setHistory([{ state: initialState(), move: null, captured: null }]);
    setSelected(null);
    setPendingPromotion(null);
  };

  const completePromotion = (promotion: PieceType) => {
    if (!pendingPromotion) return;
    applyMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion });
    setPendingPromotion(null);
  };

  const turnLabel = current.turn === "w" ? "White" : "Black";
  const turnGlyph = current.turn === "w" ? "♔" : "♚";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-background pb-16"
    >
      <header className="sticky top-0 z-40 border-b border-violet-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
            <GameLogo className="size-7" />
            <span className="font-display text-lg font-bold">Chess</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            >
              {soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
            >
              <Settings className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-violet-100">
            <span className="text-lg leading-none">{turnGlyph}</span>
            <span className="font-display text-sm font-bold">{turnLabel} to move</span>
            {status.status === "check" && (
              <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                Check!
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={newGame}
              className="rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 shadow-lg shadow-violet-200 hover:from-violet-600 hover:to-indigo-600"
            >
              <RotateCcw className="size-4" />
              New game
            </Button>
            <Button
              onClick={undo}
              variant="outline"
              className="rounded-full"
              disabled={history.length <= 1 || over}
            >
              <Undo2 className="size-4" />
              Undo
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
          <div className="w-full max-w-[min(92vw,520px)]">
            <div className="grid grid-cols-8 overflow-hidden rounded-2xl shadow-2xl shadow-violet-100 ring-1 ring-orange-900/20">
              {Array.from({ length: 64 }, (_, i) => {
                const sq = indexToSquare(i);
                const piece = current.board[i];
                const r = Math.floor(i / 8);
                const c = i % 8;
                const isLight = (r + c) % 2 === 0;
                const isSelected = selected === sq;
                const isLast = lastMove !== null && (lastMove.from === sq || lastMove.to === sq);
                const target = movesFromSelected.find((m) => m.to === sq);
                const isKingCheck = kingInCheck === sq;
                return (
                  <button
                    key={sq}
                    type="button"
                    aria-label={sq}
                    onClick={() => handleSquareClick(sq)}
                    className={cn(
                      "relative flex aspect-square items-center justify-center transition-colors",
                      (isSelected || target) && "z-10",
                    )}
                    style={{ backgroundColor: isLight ? LIGHT_SQ : DARK_SQ }}
                  >
                    {isLast && (
                      <span className="absolute inset-0 bg-amber-300/40" />
                    )}
                    {isKingCheck && (
                      <span className="absolute inset-0 bg-rose-500/40 ring-2 ring-rose-600/80 ring-inset" />
                    )}
                    {isSelected && (
                      <span className="absolute inset-0 bg-orange-400/50 ring-2 ring-orange-500/80 ring-inset" />
                    )}
                    {piece ? (
                      <PieceGlyph
                        piece={piece}
                        className="relative text-[clamp(1.4rem,7vw,2.4rem)]"
                      />
                    ) : null}
                    {target && !piece && (
                      <span className="absolute size-[26%] rounded-full bg-emerald-700/50" />
                    )}
                    {target && piece && (
                      <span className="absolute inset-[4%] rounded-full ring-[3px] ring-emerald-700/70" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between px-1 text-xs font-semibold text-muted-foreground">
              <span>a b c d e f g h</span>
              <span>White at bottom</span>
            </div>
          </div>

          <div className="w-full max-w-[min(92vw,520px)] space-y-4 lg:w-72 lg:max-w-none">
            {/* Captured pieces */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-violet-100">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Captured by White</span>
                <span className="flex flex-wrap justify-end gap-0.5">
                  {capturedByWhite.length === 0 ? (
                    <span className="text-muted-foreground/60">—</span>
                  ) : (
                    capturedByWhite.map((p, i) => (
                      <PieceGlyph key={i} piece={p} className="text-sm" />
                    ))
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Captured by Black</span>
                <span className="flex flex-wrap justify-end gap-0.5">
                  {capturedByBlack.length === 0 ? (
                    <span className="text-muted-foreground/60">—</span>
                  ) : (
                    capturedByBlack.map((p, i) => (
                      <PieceGlyph key={i} piece={p} className="text-sm" />
                    ))
                  )}
                </span>
              </div>
            </div>

            {/* Move log */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-violet-100">
              <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Move history
              </h3>
              {moveLog.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No moves yet — White starts.
                </p>
              ) : (
                <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-sm">
                  {moveLog.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg bg-violet-50/60 px-2 py-1">
                      <span className="w-8 shrink-0 font-semibold text-muted-foreground">
                        {r.state.fullmove}.
                      </span>
                      <span className="font-mono text-xs font-semibold">
                        {r.move.from} → {r.move.to}
                        {r.move.promotion ? `=${r.move.promotion.toUpperCase()}` : ""}
                      </span>
                      {r.captured && (
                        <PieceGlyph piece={r.captured} className="ml-auto text-sm" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Play two players on one device. Tap a piece to see its legal moves,
              then tap a highlighted square to move. Castling, en passant, and
              promotion are supported.
            </p>
          </div>
        </div>
      </main>

      {/* Game over overlay */}
      <AnimatePresence>
        {over && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            {status.status === "checkmate" && <Confetti />}
            <motion.div
              initial={{ scale: 0.85, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="relative w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
            >
              <div className="text-5xl">
                {status.status === "checkmate" ? "🏆" : "🤝"}
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold">
                {status.status === "checkmate"
                  ? `Checkmate! ${status.winner === "w" ? "White" : "Black"} wins`
                  : status.status === "stalemate"
                    ? "Stalemate"
                    : "Draw"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {status.status === "checkmate"
                  ? "Brilliant game — the king has nowhere to go."
                  : "Neither side can force a win."}
              </p>
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={newGame}
                  className="flex-1 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 shadow-lg shadow-violet-200 hover:from-violet-600 hover:to-indigo-600"
                >
                  <RotateCcw className="size-4" />
                  Play again
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/" className="flex items-center gap-1.5">
                    <Home className="size-4" />
                    Home
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promotion picker */}
      <AnimatePresence>
        {pendingPromotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
            >
              <h2 className="font-display text-2xl font-bold">Promote your pawn</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a piece:</p>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {PROMO_PIECES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => completePromotion(t)}
                    className="flex aspect-square items-center justify-center rounded-2xl bg-violet-50 text-3xl transition hover:bg-violet-100 active:scale-95"
                  >
                    <PieceGlyph
                      piece={{ type: t, color: current.turn }}
                      className="text-4xl"
                    />
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="mt-4 w-full rounded-full"
                onClick={() => setPendingPromotion(null)}
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </motion.div>
  );
}

const CONFETTI_COLORS = [
  "#f97316", "#fbbf24", "#2dd4bf", "#f472b6", "#a78bfa", "#4ade80", "#38bdf8",
];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 130 + Math.random() * 240;
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 60,
          rotate: (Math.random() - 0.5) * 1080,
          scale: 0.5 + Math.random() * 0.9,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: Math.random() * 0.35,
          duration: 1 + Math.random() * 0.8,
          round: i % 4 === 0,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-1/2 left-1/2"
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: p.scale }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            width: 10,
            height: p.round ? 10 : 14,
            borderRadius: p.round ? 999 : 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}
