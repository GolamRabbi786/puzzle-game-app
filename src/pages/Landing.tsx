import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Crown,
  Gamepad2,
  Lock,
  Puzzle as PuzzleIcon,
  Settings,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameLogo } from "@/components/GameLogo";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useSoundPreference } from "@/hooks/use-sound-preference";
import {
  DIFFICULTIES,
  formatTime,
  getBest,
  getWins,
  isBetter,
  type BestScore,
} from "@/lib/game-storage";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Tap a tile",
    desc: "Tap any number in the same row or column as the empty slot.",
  },
  {
    title: "Slide & arrange",
    desc: "Tiles slide into the gap. Get every number in order, 1 → 15.",
  },
  {
    title: "Beat your best",
    desc: "Fewer moves and faster time win. Scores save on this device.",
  },
];

function MiniBoard({ best }: { best: BestScore | null }) {
  const TILES: [string, string][] = [
    ["#fb923c", "#ea580c"],
    ["#2dd4bf", "#0d9488"],
    ["#f472b6", "#db2777"],
    ["#facc15", "#d97706"],
    ["#a78bfa", "#7c3aed"],
    ["#4ade80", "#16a34a"],
    ["#38bdf8", "#0284c7"],
    ["#fb7185", "#e11d48"],
  ];
  return (
    <div>
      <div className="grid w-44 grid-cols-3 gap-2 rounded-[1.75rem] bg-white/95 p-3 shadow-2xl shadow-orange-900/30">
        {TILES.map(([light, dark], i) => (
          <div
            key={i}
            className="aspect-square rounded-xl shadow-md"
            style={{ background: `linear-gradient(145deg, ${light}, ${dark})` }}
          />
        ))}
        <div className="aspect-square rounded-xl border-2 border-dashed border-orange-300 bg-orange-100/70" />
      </div>
      <div className="mt-3 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-foreground shadow-lg">
          <Trophy className="size-3.5 text-amber-500" />
          {best ? `Best: ${best.moves} moves · ${formatTime(best.time)}` : "Beat your best — play now!"}
        </span>
      </div>
    </div>
  );
}

function PuzzleCard() {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-lg shadow-orange-100 ring-1 ring-orange-100 transition-shadow hover:shadow-xl hover:shadow-orange-200/70"
    >
      <div className="h-2 bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-md">
            <PuzzleIcon className="size-6" />
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Available
          </Badge>
        </div>
        <h3 className="mt-4 font-display text-xl font-bold">Number Puzzle</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">
          Slide the numbered tiles into order. A classic brain teaser for every age.
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">3×3 · 4×4 · 5×5</span>
          <Button
            asChild
            size="sm"
            className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 hover:from-orange-600 hover:to-pink-600"
          >
            <Link to="/game/puzzle">
              Play
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ComingSoonCard({
  emoji,
  title,
  desc,
  chip,
}: {
  emoji: string;
  title: string;
  desc: string;
  chip: string;
}) {
  return (
    <div className="flex flex-col rounded-3xl bg-white/70 p-5 ring-1 ring-orange-100/70">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl text-2xl",
            chip,
          )}
        >
          {emoji}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
          <Lock className="size-3" />
          Coming soon
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-foreground/70">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground/80">{desc}</p>
    </div>
  );
}

const STAT_ACCENTS: Record<string, string> = {
  orange: "from-orange-500 to-pink-500",
  teal: "from-teal-400 to-emerald-500",
  violet: "from-violet-400 to-indigo-500",
};

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: keyof typeof STAT_ACCENTS;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100">
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
          STAT_ACCENTS[accent],
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="font-display text-2xl leading-tight font-bold">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { soundOn, toggleSound } = useSoundPreference();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const best = useMemo<BestScore | null>(() => {
    let current: BestScore | null = null;
    for (const d of DIFFICULTIES) {
      const s = getBest(d.size);
      if (s && (!current || isBetter(s, current))) current = s;
    }
    return current;
  }, []);
  const wins = useMemo(() => getWins(), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background"
    >
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <GameLogo className="size-8" />
            <span className="font-display text-xl font-bold">GameZone</span>
            <Badge className="ml-1 hidden rounded-full bg-teal-100 text-teal-700 hover:bg-teal-100 sm:inline-flex">
              Offline Games
            </Badge>
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
        {/* Hero */}
        <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 p-8 shadow-2xl shadow-orange-200 sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-8 right-16 size-24 rotate-12 rounded-3xl bg-white/15"
            />
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-4 left-10 size-14 -rotate-12 rounded-2xl bg-white/10"
            />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 right-1/3 size-6 rotate-45 rounded-md bg-white/20"
            />
          </div>

          <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
            <div className="max-w-xl text-center lg:text-left">
              <Badge className="bg-white/20 px-3 py-1 font-semibold text-white backdrop-blur hover:bg-white/20">
                <WifiOff className="size-3.5" />
                100% offline — no internet needed
              </Badge>
              <h1 className="mt-4 font-display text-4xl leading-tight font-bold text-white sm:text-5xl">
                Classic games,{" "}
                <span className="text-amber-300">right in your browser.</span>
              </h1>
              <p className="mt-4 text-base text-white/85 sm:text-lg">
                GameZone brings your favorite casual games to the browser. Tap a game, start
                playing — no downloads, no accounts, no waiting.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-white px-7 font-display text-base font-bold text-orange-600 shadow-lg hover:bg-orange-50"
                >
                  <Link to="/game/puzzle">
                    <PuzzleIcon className="size-5" />
                    Play Puzzle
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="rounded-full px-6 font-display text-base text-white hover:bg-white/15 hover:text-white"
                >
                  <a href="#how-to-play">How to play</a>
                </Button>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative shrink-0"
            >
              <MiniBoard best={best} />
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Gamepad2 className="size-6" />}
            label="Games available"
            value="1"
            sub="Number Puzzle"
            accent="orange"
          />
          <StatCard
            icon={<Trophy className="size-6" />}
            label="Best solve"
            value={best ? `${best.moves} moves` : "—"}
            sub={best ? formatTime(best.time) : "Solve it first!"}
            accent="teal"
          />
          <StatCard
            icon={<Crown className="size-6" />}
            label="Games won"
            value={String(wins)}
            sub="Saved on this device"
            accent="violet"
          />
        </section>

        {/* Games */}
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">All games</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a game and play — everything works offline.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              v1.0
            </Badge>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <PuzzleCard />
            <ComingSoonCard
              emoji="🐍"
              title="Snake"
              desc="Guide the snake, eat the food, and grow. Coming soon."
              chip="bg-teal-50"
            />
            <ComingSoonCard
              emoji="♟️"
              title="Chess"
              desc="The timeless battle of minds, board and pieces. Coming soon."
              chip="bg-violet-50"
            />
            <ComingSoonCard
              emoji="🧠"
              title="Memory"
              desc="Flip the cards and match the pairs before time runs out. Coming soon."
              chip="bg-rose-50"
            />
          </div>
        </section>

        {/* How to play */}
        <section id="how-to-play" className="mt-14 scroll-mt-20">
          <h2 className="text-center font-display text-2xl font-bold">
            How to play Number Puzzle
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Three steps to your first solve.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                whileHover={{ y: -4 }}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 font-display font-bold text-white shadow-md">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-8 font-display text-base font-bold shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-pink-600"
            >
              <Link to="/game/puzzle">
                <Sparkles className="size-5" />
                Start playing
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-orange-100 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-1.5 font-display font-semibold text-foreground">
            <GameLogo className="size-5" />
            GameZone
          </div>
          <p>Offline Games · v1.0 · Scores saved on this device</p>
        </div>
      </footer>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </motion.div>
  );
}
