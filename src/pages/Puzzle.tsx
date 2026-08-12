import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Home,
  Move,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameLogo } from "@/components/GameLogo";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useSoundPreference } from "@/hooks/use-sound-preference";
import {
  addWin,
  DIFFICULTIES,
  formatTime,
  getBest,
  getSoundOn,
  saveBest,
  type BestScore,
} from "@/lib/game-storage";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Status = "idle" | "playing" | "paused" | "won";

const TILE_COLORS: [string, string][] = [
  ["#fb7185", "#e11d48"],
  ["#fb923c", "#ea580c"],
  ["#fbbf24", "#d97706"],
  ["#4ade80", "#16a34a"],
  ["#2dd4bf", "#0d9488"],
  ["#38bdf8", "#0284c7"],
  ["#818cf8", "#4f46e5"],
  ["#c084fc", "#9333ea"],
  ["#f472b6", "#db2777"],
];

function tileGradient(v: number): string {
  const [light, dark] = TILE_COLORS[(v - 1) % TILE_COLORS.length];
  return `linear-gradient(145deg, ${light}, ${dark})`;
}

function makeSolved(size: number): number[] {
  const cells = size * size;
  return Array.from({ length: cells }, (_, i) => (i === cells - 1 ? 0 : i + 1));
}

function neighbors(index: number, size: number): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const out: number[] = [];
  if (r > 0) out.push(index - size);
  if (r < size - 1) out.push(index + size);
  if (c > 0) out.push(index - 1);
  if (c < size - 1) out.push(index + 1);
  return out;
}

function isSolved(board: number[], size: number): boolean {
  const cells = size * size;
  return board.every((v, i) => v === (i === cells - 1 ? 0 : i + 1));
}

function randomWalk(size: number): { board: number[]; empty: number } {
  const board = makeSolved(size);
  const cells = size * size;
  let empty = cells - 1;
  let prev = -1;
  const steps = cells * 60;
  for (let i = 0; i < steps; i++) {
    const options = neighbors(empty, size).filter((n) => n !== prev);
    const next = options[Math.floor(Math.random() * options.length)];
    [board[empty], board[next]] = [board[next], board[empty]];
    prev = empty;
    empty = next;
  }
  return { board, empty };
}

function shuffleBoard(size: number): { board: number[]; empty: number } {
  let walk = randomWalk(size);
  while (isSolved(walk.board, size)) walk = randomWalk(size);
  return walk;
}

const CONFETTI_COLORS = ["#f97316", "#fbbf24", "#2dd4bf", "#f472b6", "#a78bfa", "#4ade80", "#38bdf8"];

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

function StatChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-orange-100">
      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </span>
      <span className="font-display text-lg font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function Puzzle() {
  const { soundOn, toggleSound } = useSoundPreference();
  const [size, setSize] = useState(4);
  const [game, setGame] = useState<{ board: number[]; empty: number }>(() => shuffleBoard(4));
  const { board, empty } = game;
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [bestVersion, setBestVersion] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const best = useMemo(() => getBest(size), [size, bestVersion]);

  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const startNewGame = useCallback((nextSize: number) => {
    setSize(nextSize);
    setGame(shuffleBoard(nextSize));
    setMoves(0);
    setElapsed(0);
    setStatus("idle");
    setNewBest(false);
    setBestVersion((v) => v + 1);
    if (getSoundOn()) sfx.shuffle();
  }, []);

  const handleTileTap = useCallback(
    (index: number) => {
      if (status === "won" || status === "paused") return;
      if (index === empty) return;
      const row = Math.floor(index / size);
      const col = index % size;
      const emptyRow = Math.floor(empty / size);
      const emptyCol = empty % size;
      if (row !== emptyRow && col !== emptyCol) return;

      const next = [...board];
      let indices: number[] = [];
      if (row === emptyRow) {
        const lo = Math.min(col, emptyCol);
        const hi = Math.max(col, emptyCol);
        indices = Array.from({ length: hi - lo + 1 }, (_, k) => row * size + lo + k);
      } else {
        const lo = Math.min(row, emptyRow);
        const hi = Math.max(row, emptyRow);
        indices = Array.from({ length: hi - lo + 1 }, (_, k) => (lo + k) * size + col);
      }
      const values = indices.map((k) => next[k]);
      if (empty > index) {
        next[indices[0]] = 0;
        for (let k = 1; k < indices.length; k++) next[indices[k]] = values[k - 1];
      } else {
        next[indices[indices.length - 1]] = 0;
        for (let k = 0; k < indices.length - 1; k++) next[indices[k]] = values[k + 1];
      }

      const nextMoves = moves + 1;
      setGame({ board: next, empty: index });
      setMoves(nextMoves);
      if (status === "idle") setStatus("playing");
      if (getSoundOn()) sfx.move();

      if (isSolved(next, size)) {
        const isNewBest = saveBest(size, { moves: nextMoves, time: elapsed });
        addWin();
        setNewBest(isNewBest);
        setStatus("won");
        setBestVersion((v) => v + 1);
        if (getSoundOn()) sfx.win();
      }
    },
    [board, empty, moves, status, size, elapsed],
  );

  const handlePause = () => {
    if (status === "playing") {
      setStatus("paused");
      if (getSoundOn()) sfx.pause();
    } else if (status === "paused") {
      setStatus("playing");
      if (getSoundOn()) sfx.click();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-background pb-16"
    >
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
            <GameLogo className="size-7" />
            <span className="font-display text-lg font-bold">Number Puzzle</span>
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
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            {DIFFICULTIES.map((d) => {
              const active = d.size === size;
              return (
                <button
                  key={d.size}
                  onClick={() => startNewGame(d.size)}
                  className={cn(
                    "rounded-full px-4 py-2 font-display text-sm font-semibold transition-all",
                    active
                      ? "scale-105 bg-primary text-primary-foreground shadow-lg shadow-orange-200"
                      : "bg-white text-muted-foreground ring-1 ring-orange-100 hover:text-foreground hover:ring-orange-300",
                  )}
                >
                  {d.name}
                  <span
                    className={cn(
                      "ml-1.5 text-xs",
                      active ? "text-primary-foreground/80" : "text-muted-foreground/70",
                    )}
                  >
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
            <StatChip icon={<Timer className="size-3.5" />} label="Time" value={formatTime(elapsed)} accent="#f97316" />
            <StatChip icon={<Move className="size-3.5" />} label="Moves" value={String(moves)} accent="#0d9488" />
            <StatChip
              icon={<Trophy className="size-3.5" />}
              label="Best"
              value={best ? `${best.moves} · ${formatTime(best.time)}` : "—"}
              accent="#7c3aed"
            />
          </div>
        </div>

        <div className="mx-auto mt-6 w-full max-w-[min(92vw,430px)]">
          <div className="rounded-[1.75rem] bg-white p-3 shadow-xl shadow-orange-100/70 ring-1 ring-orange-100 sm:p-4">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                gap: size === 3 ? 12 : size === 4 ? 10 : 8,
              }}
            >
              {board.map((v, index) =>
                v === 0 ? (
                  <div
                    key="hole"
                    className="aspect-square rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/70"
                  />
                ) : (
                  <motion.button
                    key={v}
                    layout
                    transition={{ type: "spring", stiffness: 550, damping: 34 }}
                    onClick={() => handleTileTap(index)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-2xl font-display font-bold text-white shadow-md select-none [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]",
                      size === 3 ? "text-3xl" : size === 4 ? "text-2xl" : "text-xl",
                    )}
                    style={{ background: tileGradient(v) }}
                  >
                    {v}
                  </motion.button>
                ),
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <Button
              onClick={() => startNewGame(size)}
              className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-pink-600"
            >
              <RotateCcw className="size-4" />
              New game
            </Button>
            {status === "paused" ? (
              <Button onClick={handlePause} variant="outline" className="rounded-full">
                <Play className="size-4" />
                Resume
              </Button>
            ) : status === "playing" ? (
              <Button onClick={handlePause} variant="outline" className="rounded-full">
                <Pause className="size-4" />
                Pause
              </Button>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Tap any tile in the same row or column as the empty slot to slide it.
        </p>
      </main>

      <AnimatePresence>
        {status === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
            >
              <div className="text-4xl">⏸️</div>
              <h2 className="mt-2 font-display text-2xl font-bold">Game paused</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Take a breather — the timer is stopped.
              </p>
              <div className="mt-6 grid gap-2">
                <Button onClick={handlePause} className="rounded-full">
                  Resume
                </Button>
                <Button
                  onClick={() => startNewGame(size)}
                  variant="outline"
                  className="rounded-full"
                >
                  <RotateCcw className="size-4" />
                  New game
                </Button>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link to="/" className="flex items-center justify-center gap-1.5">
                    <Home className="size-4" />
                    Back to home
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === "won" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <Confetti />
            <motion.div
              initial={{ scale: 0.85, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="relative w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
            >
              <div className="text-5xl">🎉</div>
              <h2 className="mt-2 font-display text-2xl font-bold">Puzzle solved!</h2>
              {newBest ? (
                <Badge className="mt-3 bg-amber-400 text-amber-950 hover:bg-amber-400">
                  🏆 New best score!
                </Badge>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Brilliant — you cracked it.</p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-orange-50 px-3 py-3 ring-1 ring-orange-100">
                  <div className="text-xs font-semibold text-muted-foreground">Moves</div>
                  <div className="font-display text-xl font-bold">{moves}</div>
                </div>
                <div className="rounded-2xl bg-teal-50 px-3 py-3 ring-1 ring-teal-100">
                  <div className="text-xs font-semibold text-muted-foreground">Time</div>
                  <div className="font-display text-xl font-bold">{formatTime(elapsed)}</div>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={() => startNewGame(size)}
                  className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-pink-600"
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

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </motion.div>
  );
}
