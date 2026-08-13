import { useMemo } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Crown,
  Gamepad2,
  LogOut,
  Puzzle as PuzzleIcon,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameLogo } from "@/components/GameLogo";
import { useAuth } from "@/hooks/use-auth";
import {
  DIFFICULTIES,
  formatTime,
  getBest,
  getWins,
  isBetter,
  type BestScore,
} from "@/lib/game-storage";
import { cn } from "@/lib/utils";

const STAT_ACCENTS: Record<string, string> = {
  orange: "from-orange-500 to-pink-500",
  teal: "from-teal-400 to-emerald-500",
  violet: "from-violet-400 to-indigo-500",
};

const DOT_COLORS = ["#f97316", "#2dd4bf", "#a78bfa"];

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const stats = useMemo(() => {
    let best: BestScore | null = null;
    for (const d of DIFFICULTIES) {
      const s = getBest(d.size);
      if (s && (!best || isBetter(s, best))) best = s;
    }
    return { best, wins: getWins() };
  }, []);

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
          </Link>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 p-8 shadow-2xl shadow-orange-200 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge className="bg-white/20 px-3 py-1 font-semibold text-white backdrop-blur hover:bg-white/20">
                <Crown className="size-3.5" />
                Player stats
              </Badge>
              <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
                {user?.name ? `Welcome, ${user.name}` : "Welcome back, player!"}
              </h1>
              <p className="mt-2 max-w-md text-sm text-white/85">
                Your puzzle journey so far — best solves, wins, and everything
                saved on this device.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="shrink-0 rounded-full bg-white px-6 font-display text-base font-bold text-orange-600 shadow-lg hover:bg-orange-50"
            >
              <Link to="/game/puzzle">
                <PuzzleIcon className="size-5" />
                Play puzzle
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
                STAT_ACCENTS.teal,
              )}
            >
              <Trophy className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Games won
              </p>
              <p className="font-display text-2xl leading-tight font-bold">
                {stats.wins}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Solved puzzles saved on this device
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
                STAT_ACCENTS.violet,
              )}
            >
              <Crown className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Best solve
              </p>
              <p className="font-display text-2xl leading-tight font-bold">
                {stats.best ? `${stats.best.moves} moves` : "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {stats.best
                  ? `in ${formatTime(stats.best.time)} · across all difficulties`
                  : "Solve your first puzzle to set one"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Best scores</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your fastest solves by difficulty.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              <Gamepad2 className="size-3" />
              Number Puzzle
            </Badge>
          </div>
          <div className="mt-5 space-y-3">
            {DIFFICULTIES.map((d, i) => {
              const score = getBest(d.size);
              return (
                <div
                  key={d.size}
                  className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow-sm ring-1 ring-orange-100"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3 rounded-full"
                      style={{ background: DOT_COLORS[i] }}
                    />
                    <div>
                      <p className="font-display text-lg leading-tight font-bold">
                        {d.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.label} grid
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold">
                      {score ? `${score.moves} moves` : "No score yet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {score ? formatTime(score.time) : "Play to set your best"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-8 font-display text-base font-bold shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-pink-600"
            >
              <Link to="/game/puzzle">
                Keep playing
                <ChevronRight className="size-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-orange-100 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-1.5 font-display font-semibold text-foreground">
            <GameLogo className="size-5" />
            GameZone
          </div>
          <p>Offline Games · v1.0 · Scores saved on this device</p>
        </div>
      </footer>
    </motion.div>
  );
}
