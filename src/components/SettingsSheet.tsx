import type { ReactNode } from "react";
import { toast } from "sonner";
import { Crown, Trash2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameLogo } from "@/components/GameLogo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useSoundPreference } from "@/hooks/use-sound-preference";
import {
  clearScores,
  DIFFICULTIES,
  formatTime,
  getBest,
  getSnakeHigh,
  getWins,
} from "@/lib/game-storage";

const DOT_COLORS = ["#f97316", "#2dd4bf", "#a78bfa"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { soundOn, toggleSound } = useSoundPreference();
  const bestScores = DIFFICULTIES.map((d) => ({ size: d.size, score: getBest(d.size) }));
  const wins = getWins();
  const snakeHigh = getSnakeHigh();

  const handleClear = () => {
    clearScores();
    toast("All scores cleared", { description: "Your best times have been reset." });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Settings</SheetTitle>
          <SheetDescription>Sound, scores &amp; about GameZone</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
          <Section title="Sound">
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {soundOn ? (
                  <Volume2 className="size-4 text-primary" />
                ) : (
                  <VolumeX className="size-4 text-muted-foreground" />
                )}
                Sound effects
              </div>
              <Switch checked={soundOn} onCheckedChange={toggleSound} />
            </div>
          </Section>

          <Section title="Best scores">
            {bestScores.map(({ size, score }, i) => (
              <div
                key={size}
                className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: DOT_COLORS[i] }}
                  />
                  <span>
                    {DIFFICULTIES[i].name}{" "}
                    <span className="font-normal text-muted-foreground">
                      {DIFFICULTIES[i].label}
                    </span>
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {score ? `${score.moves} moves · ${formatTime(score.time)}` : "No score yet"}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Crown className="size-4 text-amber-500" />
                Games won
              </div>
              <span className="text-sm font-semibold">{wins}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-base leading-none">🐍</span>
                Snake · High score
              </div>
              <span className="text-sm font-semibold">
                {snakeHigh > 0 ? snakeHigh : "No score yet"}
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={handleClear}
            >
              <Trash2 className="size-4" />
              Clear all scores
            </Button>
          </Section>

          <Section title="About">
            <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-pink-50 p-4 ring-1 ring-orange-100">
              <div className="flex items-center gap-2 font-display font-bold">
                <GameLogo className="size-6" />
                GameZone
                <span className="font-sans text-xs font-semibold text-muted-foreground">
                  v1.0
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                All games run 100% offline. Scores and settings are saved on this device only.
              </p>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
