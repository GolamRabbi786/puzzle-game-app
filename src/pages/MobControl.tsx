import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Lock,
  RotateCcw,
  Settings,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameLogo } from "@/components/GameLogo";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useSoundPreference } from "@/hooks/use-sound-preference";
import { getMobLevel, getSoundOn, saveMobLevel } from "@/lib/game-storage";
import {
  MOB_LEVELS,
  PLAYER_COLOR,
  type MobEnemy,
  type MobHole,
  type MobLevel,
  type MobPickup,
} from "@/lib/mob-levels";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

const W = 900;
const H = 600;

interface Mob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  count: number;
  light: string;
  dark: string;
  kind: "player" | "enemy";
  heading: number;
  turnTimer: number;
  seed: number;
  alive: boolean;
  hit: number;
}

function mobRadius(count: number): number {
  return 24 + Math.sqrt(Math.max(count, 1)) * 5.5;
}

function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

class MobGame {
  ctx: CanvasRenderingContext2D;
  level: MobLevel;
  player: Mob;
  enemies: Mob[] = [];
  pickups: (MobPickup & { taken: boolean })[] = [];
  pointer = { active: false, x: W / 2, y: H / 2, gx: 0, gy: 0 };
  keys = new Set<string>();
  raf = 0;
  last = 0;
  running = true;
  private lastHud = { p: -1, e: -1 };
  private onEnd: (result: "won" | "lost") => void;
  private onHud: (player: number, enemies: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    level: MobLevel,
    onEnd: (result: "won" | "lost") => void,
    onHud: (player: number, enemies: number) => void,
  ) {
    this.onEnd = onEnd;
    this.onHud = onHud;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    this.ctx = ctx;
    this.level = level;

    this.player = {
      x: 130,
      y: H - 120,
      vx: 0,
      vy: 0,
      count: level.player,
      light: PLAYER_COLOR[0],
      dark: PLAYER_COLOR[1],
      kind: "player",
      heading: 0,
      turnTimer: 0,
      seed: Math.random() * 1000,
      alive: true,
      hit: 0,
    };

    for (const e of level.enemies) this.enemies.push(this.makeMob(e, "enemy"));
    this.pickups = level.pickups.map((p) => ({ ...p, taken: false }));

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("lostpointercapture", this.onPointerUp);
  }

  private makeMob(e: MobEnemy, kind: "enemy"): Mob {
    return {
      x: e.x,
      y: e.y,
      vx: 0,
      vy: 0,
      count: e.count,
      light: e.color[0],
      dark: e.color[1],
      kind,
      heading: Math.random() * Math.PI * 2,
      turnTimer: 1 + Math.random() * 2,
      seed: Math.random() * 1000,
      alive: true,
      hit: 0,
    };
  }

  private onPointerDown = (e: PointerEvent) => {
    const canvas = this.ctx.canvas;
    canvas.setPointerCapture(e.pointerId);
    const p = this.toLogical(e);
    this.pointer.active = true;
    this.pointer.gx = this.player.x - p.x;
    this.pointer.gy = this.player.y - p.y;
    this.pointer.x = p.x;
    this.pointer.y = p.y;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointer.active) return;
    const p = this.toLogical(e);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
  };

  private onPointerUp = () => {
    this.pointer.active = false;
  };

  private toLogical(e: PointerEvent): { x: number; y: number } {
    const canvas = this.ctx.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * W) / rect.width,
      y: ((e.clientY - rect.top) * H) / rect.height,
    };
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
      e.preventDefault();
      this.keys.add(k);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  start() {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    const canvas = this.ctx.canvas;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    canvas.removeEventListener("lostpointercapture", this.onPointerUp);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private loop = (t: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const p = this.player;

    // Player movement: drag toward pointer, or keyboard.
    let mx = 0;
    let my = 0;
    if (this.pointer.active) {
      const tx = this.pointer.x + this.pointer.gx;
      const ty = this.pointer.y + this.pointer.gy;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        mx = (dx / d) * 360;
        my = (dy / d) * 360;
      }
    } else {
      const up = this.keys.has("arrowup") || this.keys.has("w");
      const down = this.keys.has("arrowdown") || this.keys.has("s");
      const left = this.keys.has("arrowleft") || this.keys.has("a");
      const right = this.keys.has("arrowright") || this.keys.has("d");
      if (up) my -= 330;
      if (down) my += 330;
      if (left) mx -= 330;
      if (right) mx += 330;
    }
    p.vx += (mx - p.vx) * Math.min(1, dt * 10);
    p.vy += (my - p.vy) * Math.min(1, dt * 10);
    p.x = clamp(p.x + p.vx * dt, 34, W - 34);
    p.y = clamp(p.y + p.vy * dt, 34, H - 34);

    // Enemies wander slowly.
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.turnTimer -= dt;
      if (e.turnTimer <= 0) {
        e.heading = Math.random() * Math.PI * 2;
        e.turnTimer = 2 + Math.random() * 3;
      }
      e.vx += Math.cos(e.heading) * 42 * dt;
      e.vy += Math.sin(e.heading) * 42 * dt;
      const damp = 1 - Math.min(1, dt * 2.4);
      e.vx *= damp;
      e.vy *= damp;
      e.x = clamp(e.x + e.vx * dt, 34, W - 34);
      e.y = clamp(e.y + e.vy * dt, 34, H - 34);
      if (e.hit > 0) e.hit -= dt;
    }
    if (p.hit > 0) p.hit -= dt;

    // Contact pushes: the bigger mob shoves the smaller one.
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minD = (mobRadius(p.count) + mobRadius(e.count)) * 0.92;
      if (dist < minD) {
        const nx = dx / dist;
        const ny = dy / dist;
        if (p.count > e.count) {
          const force = Math.min(5, 1 + (p.count - e.count) / 6);
          e.vx += nx * 430 * force * dt;
          e.vy += ny * 430 * force * dt;
          e.count -= 11 * (p.count / e.count) * dt;
          const wasHit = e.hit > 0;
          e.hit = 0.25;
          if (!wasHit && getSoundOn()) sfx.move();
        } else if (e.count > p.count) {
          const force = Math.min(5, 1 + (e.count - p.count) / 6);
          p.vx -= nx * 430 * force * dt;
          p.vy -= ny * 430 * force * dt;
          p.count -= 11 * (e.count / p.count) * dt;
          const wasHit = p.hit > 0;
          p.hit = 0.25;
          if (!wasHit && getSoundOn()) sfx.move();
        } else {
          // Equal strength: shove each other apart.
          e.vx += nx * 220 * dt;
          e.vy += ny * 220 * dt;
          p.vx -= nx * 220 * dt;
          p.vy -= ny * 220 * dt;
        }
      }
    }

    // Holes suck units in and drain them.
    for (const hole of this.level.holes) this.applyHole(p, hole, dt);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      for (const hole of this.level.holes) this.applyHole(e, hole, dt);
    }

    // Pickups grow the player mob.
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < mobRadius(p.count) + 18) {
        pk.taken = true;
        p.count += pk.value;
        if (getSoundOn()) sfx.eat();
      }
    }

    if (p.count <= 0) {
      p.alive = false;
      this.end("lost");
      return;
    }
    const aliveEnemies = this.enemies.filter((e) => e.alive).length;
    if (aliveEnemies === 0) {
      this.end("won");
      return;
    }

    const pr = Math.round(p.count);
    if (pr !== this.lastHud.p || aliveEnemies !== this.lastHud.e) {
      this.lastHud = { p: pr, e: aliveEnemies };
      this.onHud(pr, aliveEnemies);
    }
  }

  private applyHole(mob: Mob, hole: MobHole, dt: number) {
    const dx = hole.x - mob.x;
    const dy = hole.y - mob.y;
    const dist = Math.hypot(dx, dy);
    const edge = hole.r + mobRadius(mob.count) * 0.45;
    if (dist < edge) {
      const pull = (edge - dist) / edge;
      if (dist > 0.01) {
        mob.vx += (dx / dist) * 340 * pull * dt;
        mob.vy += (dy / dist) * 340 * pull * dt;
      }
      mob.count -= 16 * (0.4 + pull) * dt;
      mob.hit = 0.2;
    }
  }

  private end(result: "won" | "lost") {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.onEnd(result);
  }

  private draw() {
    const ctx = this.ctx;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#fff7e6");
    bg.addColorStop(1, "#fdeee0");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Arena border
    ctx.strokeStyle = "rgba(201,134,75,0.35)";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    // Faint grid
    ctx.strokeStyle = "rgba(201,134,75,0.08)";
    ctx.lineWidth = 1;
    for (let x = 60; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, H - 20);
      ctx.stroke();
    }
    for (let y = 60; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(W - 20, y);
      ctx.stroke();
    }

    // Holes
    for (const hole of this.level.holes) {
      const g = ctx.createRadialGradient(hole.x, hole.y, 4, hole.x, hole.y, hole.r);
      g.addColorStop(0, "#3d2b1f");
      g.addColorStop(0.75, "#5b3f2b");
      g.addColorStop(1, "#8a6a45");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(61,43,31,0.55)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Pickups
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      const pulse = 1 + Math.sin(performance.now() / 300 + pk.x) * 0.12;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#92400e";
      ctx.font = "bold 11px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`+${pk.value}`, pk.x, pk.y + 0.5);
    }

    // Mobs
    const mobs: Mob[] = [this.player, ...this.enemies];
    for (const mob of mobs) {
      if (!mob.alive) continue;
      this.drawMob(mob);
    }

    // Hint arrow toward first enemy on early levels
    if (this.level.id <= 2 && this.enemies.some((e) => e.alive)) {
      ctx.fillStyle = "rgba(120,80,40,0.55)";
      ctx.font = "bold 15px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Drag to move · Push enemies into holes", W / 2, H - 14);
    }
  }

  private drawMob(mob: Mob) {
    const ctx = this.ctx;
    const r = mobRadius(mob.count);
    const n = Math.min(Math.max(Math.round(mob.count), 1), 60);

    // Under-glow
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.ellipse(mob.x, mob.y + r * 0.85, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Units
    for (let i = 0; i < n; i++) {
      const ang = i * 2.399963 + mob.seed;
      const dist = Math.sqrt((i + 0.5) / n) * r * 0.82;
      const ux = mob.x + Math.cos(ang) * dist;
      const uy = mob.y + Math.sin(ang) * dist;
      ctx.fillStyle = mob.light;
      ctx.beginPath();
      ctx.arc(ux, uy, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mob.dark;
      ctx.beginPath();
      ctx.arc(ux, uy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hit flash ring
    if (mob.hit > 0) {
      ctx.strokeStyle = `rgba(255,60,60,${Math.min(1, mob.hit * 4)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mob.x, mob.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Count label
    ctx.fillStyle = "#3b2a1a";
    ctx.font = "bold 15px Fredoka, Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(Math.max(1, Math.round(mob.count))), mob.x, mob.y + 0.5);
  }
}

type Screen = "menu" | "playing" | "won" | "lost";

export default function MobControl() {
  const { soundOn, toggleSound } = useSoundPreference();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [level, setLevel] = useState(1);
  const [unlocked, setUnlocked] = useState(() => getMobLevel());
  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState({ player: 0, enemies: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const levelDef = useMemo(() => MOB_LEVELS.find((l) => l.id === level) ?? MOB_LEVELS[0], [level]);
  const maxLevel = MOB_LEVELS.length;

  const onHud = useCallback((player: number, enemies: number) => {
    setHud({ player, enemies });
  }, []);

  const onEnd = useCallback(
    (result: "won" | "lost") => {
      if (result === "won") {
        saveMobLevel(Math.min(level + 1, maxLevel));
        setUnlocked((u) => Math.max(u, Math.min(level + 1, maxLevel)));
        setScreen("won");
      } else {
        setScreen("lost");
      }
    },
    [level, maxLevel],
  );

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new MobGame(canvas, levelDef, onEnd, onHud);
    game.start();
    return () => game.destroy();
  }, [screen, level, runId, levelDef, onEnd, onHud]);

  useEffect(() => {
    if (screen === "won" && getSoundOn()) sfx.win();
    if (screen === "lost" && getSoundOn()) sfx.gameOver();
  }, [screen]);

  const playLevel = (id: number) => {
    setLevel(id);
    setHud({ player: 0, enemies: 0 });
    setScreen("playing");
  };

  const restart = () => setRunId((n) => n + 1);

  const nextLevel = () => {
    if (level < maxLevel) playLevel(level + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-background pb-16"
    >
      <header className="sticky top-0 z-40 border-b border-amber-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
            <GameLogo className="size-7" />
            <span className="font-display text-lg font-bold">Mob Control</span>
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
        {screen === "menu" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-8 text-center shadow-2xl shadow-orange-200 sm:p-10">
              <div className="text-5xl">👥</div>
              <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
                Mob Control
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/85">
                Command your crowd. Grow your mob, shove enemy mobs into the
                holes, and clear every level to unlock the next.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Badge className="bg-white/20 px-3 py-1 font-semibold text-white backdrop-blur hover:bg-white/20">
                  <Users className="size-3.5" />
                  {maxLevel} levels
                </Badge>
                <Badge className="bg-white/20 px-3 py-1 font-semibold text-white backdrop-blur hover:bg-white/20">
                  <Trophy className="size-3.5" />
                  Reached level {unlocked}
                </Badge>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-2xl font-bold">Select a level</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Beat a level to unlock the next one.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {MOB_LEVELS.map((l) => {
                  const isUnlocked = l.id <= unlocked;
                  const isCurrent = l.id === unlocked;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => playLevel(l.id)}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-3xl p-5 text-center transition-all",
                        isUnlocked
                          ? "bg-white shadow-lg shadow-orange-100 ring-1 ring-orange-100 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-200/70"
                          : "bg-white/50 ring-1 ring-orange-100/50",
                        isCurrent && isUnlocked && "ring-2 ring-orange-400",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-11 items-center justify-center rounded-2xl font-display text-lg font-bold text-white shadow-md",
                          isUnlocked
                            ? "bg-gradient-to-br from-amber-500 to-orange-600"
                            : "bg-slate-300",
                        )}
                      >
                        {isUnlocked ? l.id : <Lock className="size-4" />}
                      </span>
                      <span
                        className={cn(
                          "font-display text-sm font-bold",
                          isUnlocked ? "text-foreground" : "text-muted-foreground/70",
                        )}
                      >
                        {l.name}
                      </span>
                      {isCurrent && isUnlocked && (
                        <Badge className="absolute top-2 right-2 bg-amber-400 text-amber-950 hover:bg-amber-400">
                          Next
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {screen === "playing" && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-orange-100 px-3 py-1 font-display text-sm font-bold text-orange-700 hover:bg-orange-100">
                  Level {level} · {levelDef.name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-sm ring-1 ring-orange-100">
                  <span className="size-2.5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
                  <span className="font-display text-sm font-bold">{hud.player}</span>
                  <span className="text-xs text-muted-foreground">yours</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-sm ring-1 ring-orange-100">
                  <span className="size-2.5 rounded-full bg-gradient-to-br from-rose-400 to-rose-600" />
                  <span className="font-display text-sm font-bold">{hud.enemies}</span>
                  <span className="text-xs text-muted-foreground">enemies</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full"
                  onClick={restart}
                  aria-label="Restart level"
                >
                  <RotateCcw className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setScreen("menu")}
                >
                  <Home className="size-4" />
                  Exit
                </Button>
              </div>
            </div>

            <div className="mx-auto mt-4 w-full max-w-[min(94vw,860px)]">
              <canvas
                ref={canvasRef}
                className="w-full touch-none rounded-[1.75rem] shadow-xl shadow-orange-100/70 ring-1 ring-orange-100"
                style={{ aspectRatio: "900 / 600" }}
              />
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Drag on the board (or use arrow keys) to move your mob · Push
              enemies into the holes · Grab the golden +pickups to grow.
            </p>
          </div>
        )}
      </main>

      {/* Won overlay */}
      <AnimatePresence>
        {screen === "won" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
            >
              <div className="text-5xl">🎉</div>
              <h2 className="mt-2 font-display text-2xl font-bold">
                Level {level} complete!
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You cleared “{levelDef.name}” with {hud.player} followers.
              </p>
              <div className="mt-6 flex gap-2">
                {level < maxLevel ? (
                  <Button
                    onClick={nextLevel}
                    className="flex-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 font-display text-base font-bold shadow-lg shadow-orange-200 hover:from-amber-600 hover:to-orange-700"
                  >
                    Next level
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setScreen("menu")}
                    className="flex-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 font-display text-base font-bold shadow-lg shadow-orange-200 hover:from-amber-600 hover:to-orange-700"
                  >
                    <Trophy className="size-4" />
                    All levels done!
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/" className="flex items-center gap-1.5">
                    <Home className="size-4" />
                    Home
                  </Link>
                </Button>
              </div>
              {level >= maxLevel && (
                <p className="mt-3 text-xs text-muted-foreground">
                  You conquered every level — a true mob boss! 👑
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lost overlay */}
      <AnimatePresence>
        {screen === "lost" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
            >
              <div className="text-5xl">💥</div>
              <h2 className="mt-2 font-display text-2xl font-bold">Mob wiped out!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your followers fell into the holes. Grow your mob and try again
                — bigger crowds push harder.
              </p>
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={restart}
                  className="flex-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 font-display text-base font-bold shadow-lg shadow-orange-200 hover:from-amber-600 hover:to-orange-700"
                >
                  <RotateCcw className="size-4" />
                  Retry
                </Button>
                <Button
                  onClick={() => setScreen("menu")}
                  variant="outline"
                  className="rounded-full"
                >
                  Levels
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
