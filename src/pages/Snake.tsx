import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameLogo } from "@/components/GameLogo";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useSoundPreference } from "@/hooks/use-sound-preference";
import { getSnakeHigh, getSoundOn, saveSnakeHigh } from "@/lib/game-storage";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

const COLS = 18;
const ROWS = 18;
const CELLS = COLS * ROWS;

type Dir = { dr: number; dc: number };
type Status = "idle" | "playing" | "paused" | "over";

const DIRS: Record<string, Dir> = {
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
  w: { dr: -1, dc: 0 },
  s: { dr: 1, dc: 0 },
  a: { dr: 0, dc: -1 },
  d: { dr: 0, dc: 1 },
  W: { dr: -1, dc: 0 },
  S: { dr: 1, dc: 0 },
  A: { dr: 0, dc: -1 },
  D: { dr: 0, dc: 1 },
};

function initialSnake(): number[] {
  const start = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2) - 2;
  return [start, start + 1, start + 2];
}

function randomFood(snake: number[]): number {
  const free: number[] = [];
  for (let i = 0; i < CELLS; i++) {
    if (!snake.includes(i)) free.push(i);
  }
  return free[Math.floor(Math.random() * free.length)];
}

function speedFor(score: number): number {
  return Math.max(75, 190 - score * 4);
}

interface GameState {
  snake: number[];
  dir: Dir;
  food: number;
  score: number;
  status: Status;
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-emerald-100">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-bold" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

export default function Snake() {
  const { soundOn, toggleSound } = useSoundPreference();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [high, setHigh] = useState(() => getSnakeHigh());
  const [newBest, setNewBest] = useState(false);
  const [game, setGame] = useState<GameState>(() => ({
    snake: initialSnake(),
    dir: { dr: 0, dc: 1 },
    food: randomFood(initialSnake()),
    score: 0,
    status: "idle",
  }));
  const pendingRef = useRef<Dir[]>([]);
  const prevScoreRef = useRef(0);

  const { snake, dir, food, score, status } = game;
  const speed = speedFor(score);
  const head = snake[snake.length - 1];

  const startGame = useCallback((d: Dir = { dr: 0, dc: 1 }) => {
    pendingRef.current = [];
    setNewBest(false);
    setGame(() => {
      const s = initialSnake();
      return { snake: s, dir: d, food: randomFood(s), score: 0, status: "playing" };
    });
    prevScoreRef.current = 0;
  }, []);

  const pushDir = useCallback(
    (d: Dir) => {
      if (game.status !== "playing") return;
      const last =
        pendingRef.current.length > 0
          ? pendingRef.current[pendingRef.current.length - 1]
          : game.dir;
      if (d.dr === -last.dr && d.dc === -last.dc) return;
      if (d.dr === last.dr && d.dc === last.dc) return;
      if (pendingRef.current.length >= 2) return;
      pendingRef.current.push(d);
    },
    [game.status, game.dir],
  );

  // Game loop
  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => {
      setGame((g) => {
        if (g.status !== "playing") return g;
        const nextDir = pendingRef.current.shift() ?? g.dir;
        const hr = Math.floor(headRef.current / COLS);
        const hc = headRef.current % COLS;
        const nr = hr + nextDir.dr;
        const nc = hc + nextDir.dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
          return { ...g, status: "over" };
        }
        const next = nr * COLS + nc;
        if (g.snake.includes(next)) {
          return { ...g, status: "over" };
        }
        const ate = next === g.food;
        const snakeNext = ate ? [...g.snake, next] : [...g.snake.slice(1), next];
        return {
          snake: snakeNext,
          dir: nextDir,
          food: ate ? randomFood(snakeNext) : g.food,
          score: g.score + (ate ? 1 : 0),
          status: "playing",
        };
      });
    }, speed);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, speed]);

  // Keep the head index available inside the interval closure.
  const headRef = useRef(head);
  headRef.current = head;

  // Sounds: eating + game over (side effects outside the state updater).
  useEffect(() => {
    if (score > prevScoreRef.current) {
      prevScoreRef.current = score;
      if (getSoundOn()) sfx.eat();
    }
  }, [score]);

  useEffect(() => {
    if (status === "over" && getSoundOn()) sfx.gameOver();
  }, [status]);

  // Persist high score when it improves.
  useEffect(() => {
    if (score > high) {
      const isNew = saveSnakeHigh(score);
      setHigh(score);
      setNewBest(isNew);
    }
  }, [score, high]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setGame((g) => (g.status === "playing" ? { ...g, status: "paused" } : g));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const togglePause = () => {
    setGame((g) => {
      if (g.status === "playing") {
        if (getSoundOn()) sfx.pause();
        return { ...g, status: "paused" };
      }
      if (g.status === "paused") {
        if (getSoundOn()) sfx.click();
        return { ...g, status: "playing" };
      }
      return g;
    });
  };

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const d = DIRS[e.key];
      if (d) {
        e.preventDefault();
        if (game.status === "playing") pushDir(d);
        else if (game.status === "idle" || game.status === "over") startGame(d);
      } else if (e.key === " " || e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (game.status === "idle" || game.status === "over") startGame();
        else togglePause();
      }
    },
    [game.status, pushDir, startGame, togglePause],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const DPadButton = ({
    dir,
    icon,
    label,
    className,
  }: {
    dir: Dir;
    icon: React.ReactNode;
    label: string;
    className?: string;
  }) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (game.status === "idle" || game.status === "over") startGame(dir);
        else pushDir(dir);
      }}
      className={cn(
        "flex size-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100 transition active:scale-90 hover:bg-emerald-50",
        className,
      )}
    >
      {icon}
    </button>
  );

  const overlay =
    status === "idle" ? (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="text-5xl">🐍</div>
        <h2 className="font-display text-2xl font-bold">Snake</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Eat the apples, grow longer, and don&apos;t crash into the walls or
          yourself. Use arrow keys / WASD or the D-pad below.
        </p>
        <Button
          onClick={() => startGame()}
          className="rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-8 font-display text-base font-bold shadow-lg shadow-emerald-200 hover:from-teal-600 hover:to-emerald-600"
        >
          <Play className="size-5" />
          Start game
        </Button>
      </div>
    ) : status === "paused" ? (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="text-4xl">⏸️</div>
        <h2 className="font-display text-2xl font-bold">Game paused</h2>
        <p className="text-sm text-muted-foreground">Take a breath — the snake is waiting.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={togglePause} className="rounded-full">
            <Play className="size-4" />
            Resume
          </Button>
          <Button onClick={() => startGame()} variant="outline" className="rounded-full">
            <RotateCcw className="size-4" />
            Restart
          </Button>
        </div>
      </div>
    ) : status === "over" ? (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="text-5xl">💥</div>
        <h2 className="font-display text-2xl font-bold">Game over</h2>
        <div className="flex gap-3">
          <div className="rounded-2xl bg-teal-50 px-5 py-3 ring-1 ring-teal-100">
            <div className="text-xs font-semibold text-muted-foreground">Score</div>
            <div className="font-display text-2xl font-bold text-teal-700">{score}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 px-5 py-3 ring-1 ring-amber-100">
            <div className="text-xs font-semibold text-muted-foreground">Best</div>
            <div className="font-display text-2xl font-bold text-amber-600">{high}</div>
          </div>
        </div>
        {newBest && score > 0 && (
          <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-400">
            🏆 New high score!
          </Badge>
        )}
        <Button
          onClick={() => startGame()}
          className="rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-8 font-display text-base font-bold shadow-lg shadow-emerald-200 hover:from-teal-600 hover:to-emerald-600"
        >
          <RotateCcw className="size-5" />
          Play again
        </Button>
      </div>
    ) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-background pb-16"
    >
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
            <GameLogo className="size-7" />
            <span className="font-display text-lg font-bold">Snake</span>
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
          <div className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
            <StatChip label="Score" value={String(score)} accent="#0d9488" />
            <StatChip label="Best" value={String(high)} accent="#d97706" />
            <StatChip label="Length" value={String(snake.length)} accent="#059669" />
          </div>
        </div>

        <div className="relative mx-auto mt-6 w-full max-w-[min(92vw,420px)]">
          <div className="rounded-[1.75rem] bg-gradient-to-br from-teal-50 to-emerald-50 p-3 shadow-xl shadow-emerald-100/70 ring-1 ring-emerald-100 sm:p-4">
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 2 }}
            >
              {Array.from({ length: CELLS }, (_, i) => {
                const isHead = i === head;
                const isBody = snake.includes(i);
                const isFood = i === food;
                return (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded-[3px]",
                      isFood && "flex items-center justify-center text-[13px] leading-none sm:text-base",
                      isHead &&
                        "z-10 bg-gradient-to-br from-lime-300 to-emerald-500 shadow-md [box-shadow:0_0_0_1px_rgba(4,120,87,0.35)]",
                      isBody && !isHead && "bg-gradient-to-br from-teal-400 to-emerald-500",
                      !isBody && !isFood && "bg-emerald-100/50",
                    )}
                  >
                    {isFood && <span className="animate-pulse">🍎</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {overlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.75rem] bg-slate-900/45 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.92, y: 12, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.92, y: 12, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className="w-full max-w-sm rounded-3xl bg-white shadow-2xl"
                >
                  {overlay}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            onClick={() => startGame()}
            className="rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-emerald-200 hover:from-teal-600 hover:to-emerald-600"
          >
            <RotateCcw className="size-4" />
            New game
          </Button>
          {status === "playing" ? (
            <Button onClick={togglePause} variant="outline" className="rounded-full">
              <Pause className="size-4" />
              Pause
            </Button>
          ) : status === "paused" ? (
            <Button onClick={togglePause} variant="outline" className="rounded-full">
              <Play className="size-4" />
              Resume
            </Button>
          ) : null}
        </div>

        <div className="mx-auto mt-6 w-fit">
          <div className="grid grid-cols-3 gap-2">
            <div />
            <DPadButton dir={DIRS.ArrowUp} icon={<ArrowUp className="size-6" />} label="Up" />
            <div />
            <DPadButton dir={DIRS.ArrowLeft} icon={<ArrowLeft className="size-6" />} label="Left" />
            <DPadButton dir={DIRS.ArrowDown} icon={<ArrowDown className="size-6" />} label="Down" />
            <DPadButton dir={DIRS.ArrowRight} icon={<ArrowRight className="size-6" />} label="Right" />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Trophy className="mr-1 inline size-3.5 text-amber-500" />
          Use arrow keys or WASD · Space to pause · Best score is saved on this device
        </p>
      </main>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </motion.div>
  );
}
