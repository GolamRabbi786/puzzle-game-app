let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; volume?: number; delay?: number } = {},
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const { type = "sine", volume = 0.08, delay = 0 } = opts;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sfx = {
  move() {
    tone(340, 0.07, { type: "triangle", volume: 0.12 });
    tone(560, 0.06, { type: "sine", volume: 0.05, delay: 0.02 });
  },
  click() {
    tone(700, 0.05, { type: "triangle", volume: 0.08 });
  },
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone(f, 0.18, { type: "triangle", volume: 0.12, delay: i * 0.12 }));
    tone(1318.5, 0.35, { type: "sine", volume: 0.1, delay: 0.5 });
  },
  shuffle() {
    tone(220, 0.08, { type: "triangle", volume: 0.08 });
    tone(180, 0.1, { type: "triangle", volume: 0.08, delay: 0.08 });
  },
  pause() {
    tone(440, 0.08, { type: "sine", volume: 0.07 });
    tone(330, 0.08, { type: "sine", volume: 0.07, delay: 0.09 });
  },
  eat() {
    tone(520, 0.07, { type: "triangle", volume: 0.12 });
    tone(780, 0.09, { type: "triangle", volume: 0.1, delay: 0.06 });
  },
  gameOver() {
    tone(300, 0.16, { type: "sawtooth", volume: 0.06 });
    tone(200, 0.22, { type: "sawtooth", volume: 0.06, delay: 0.14 });
  },
};
