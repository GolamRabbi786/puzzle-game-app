export type BestScore = { moves: number; time: number };

export const DIFFICULTIES = [
  { size: 3, label: "3×3", name: "Easy" },
  { size: 4, label: "4×4", name: "Classic" },
  { size: 5, label: "5×5", name: "Hard" },
] as const;

const SOUND_KEY = "gamezone.sound";
const BEST_PREFIX = "gamezone.best.";
const WINS_KEY = "gamezone.wins";
const SNAKE_HIGH_KEY = "gamezone.snake.high";
export const SETTINGS_EVENT = "gamezone:settings";

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getSoundOn(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(SOUND_KEY);
  return raw === null ? true : raw === "1";
}

export function setSoundOn(on: boolean): void {
  window.localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function getBest(size: number): BestScore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${BEST_PREFIX}${size}`);
    return raw ? (JSON.parse(raw) as BestScore) : null;
  } catch {
    return null;
  }
}

export function isBetter(score: BestScore, best: BestScore | null): boolean {
  if (!best) return true;
  if (score.moves !== best.moves) return score.moves < best.moves;
  return score.time < best.time;
}

export function saveBest(size: number, score: BestScore): boolean {
  if (!isBetter(score, getBest(size))) return false;
  window.localStorage.setItem(`${BEST_PREFIX}${size}`, JSON.stringify(score));
  return true;
}

export function getWins(): number {
  if (typeof window === "undefined") return 0;
  const n = Number.parseInt(window.localStorage.getItem(WINS_KEY) ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

export function addWin(): void {
  window.localStorage.setItem(WINS_KEY, String(getWins() + 1));
}

export function getSnakeHigh(): number {
  if (typeof window === "undefined") return 0;
  const n = Number.parseInt(window.localStorage.getItem(SNAKE_HIGH_KEY) ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

export function saveSnakeHigh(score: number): boolean {
  if (score <= getSnakeHigh()) return false;
  window.localStorage.setItem(SNAKE_HIGH_KEY, String(score));
  return true;
}

export function clearScores(): void {
  for (const d of DIFFICULTIES) {
    window.localStorage.removeItem(`${BEST_PREFIX}${d.size}`);
  }
  window.localStorage.removeItem(WINS_KEY);
  window.localStorage.removeItem(SNAKE_HIGH_KEY);
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}
