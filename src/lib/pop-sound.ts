// Soft "pop" sound generator using the Web Audio API.
// Zero assets, tiny footprint, and respects browser autoplay rules:
// the AudioContext is only created (and resumed) after a user gesture.

const MUTE_KEY = "coloring:pop-muted";

let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== "undefined") {
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function isPopMuted() {
  return muted;
}

export function setPopMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }
}

export function togglePopMuted() {
  setPopMuted(!muted);
  return muted;
}

/**
 * Plays a short, soft "pop" — gentle sine blip with a quick decay.
 * Safe to call from a click handler; no-op on the server, when muted,
 * or when the AudioContext is unavailable / still suspended without a
 * user gesture.
 */
export function playPop() {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;

  // Resume on first gesture if the browser suspended the context.
  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }
  if (audio.state !== "running") return;

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  // Slight pitch variation keeps repeated pops from feeling robotic.
  const base = 520 + Math.random() * 80;
  osc.type = "sine";
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * 0.55, now + 0.12);

  // Low volume + fast attack/decay = soft, unobtrusive pop.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

/**
 * Toca uma sequência curta de notas ascendentes ("sparkle"), boa para
 * sinalizar o fim de uma ação coletiva como a Pintura Mágica.
 */
export function playSparkle() {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }
  if (audio.state !== "running") return;

  const start = audio.currentTime;
  // Acorde maior arpejado: C6, E6, G6, C7
  const notes = [1046.5, 1318.5, 1568, 2093];
  const stepSec = 0.07;
  const dur = 0.22;

  notes.forEach((freq, i) => {
    const t = start + i * stepSec;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  });
}

/**
 * Pequena fanfarra de conclusão — três notas mais cheias, para celebrar
 * quando a história inteira foi colorida.
 */
export function playFanfare() {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }
  if (audio.state !== "running") return;

  const start = audio.currentTime;
  // C5 - E5 - G5 sustentadas com leve sobreposição
  const notes: Array<[number, number]> = [
    [523.25, 0.0],
    [659.25, 0.12],
    [783.99, 0.24],
  ];
  const dur = 0.55;

  notes.forEach(([freq, offset]) => {
    const t = start + offset;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  });
}
