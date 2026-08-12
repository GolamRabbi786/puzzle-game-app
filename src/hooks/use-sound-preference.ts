import { useEffect, useState } from "react";
import { getSoundOn, setSoundOn } from "@/lib/game-storage";
import { sfx } from "@/lib/sound";

/** Sound preference shared across screens; stays in sync via a storage event. */
export function useSoundPreference() {
  const [soundOn, setSoundState] = useState<boolean>(() => getSoundOn());

  useEffect(() => {
    const sync = () => setSoundState(getSoundOn());
    window.addEventListener("gamezone:settings", sync);
    return () => window.removeEventListener("gamezone:settings", sync);
  }, []);

  const toggleSound = () => {
    const next = !getSoundOn();
    setSoundOn(next);
    setSoundState(next);
    if (next) sfx.click();
  };

  return { soundOn, toggleSound };
}
