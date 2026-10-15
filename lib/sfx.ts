/* Every sound is synthesized with Web Audio, so there are no audio files. */
let ac: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => { muted = m; };

function tone(f: number, at: number, dur: number, type: OscillatorType, vol: number, to?: number) {
  if (muted || typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac = ac || new Ctx();
    if (ac.state === 'suspended') void ac.resume();
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch {
    /* no audio available; the game plays fine without it */
  }
}

/** A short vibration tick for selections. Android only; iOS browsers ignore it. */
export const haptic = (ms = 8) => { if (!muted && typeof navigator !== 'undefined') navigator.vibrate?.(ms); };

export const sfx = {
  tap() { tone(660, 0, 0.07, 'triangle', 0.12); },
  word() { tone(500 + Math.random() * 90, 0, 0.035, 'sine', 0.035); },
  buzz() { tone(98, 0, 0.45, 'sawtooth', 0.2); tone(147, 0, 0.45, 'square', 0.09); },
  rbuzz() { tone(196, 0, 0.4, 'square', 0.12); tone(294, 0, 0.4, 'sawtooth', 0.07); },
  right() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.2, 'triangle', 0.16)); },
  wrong() { tone(233, 0, 0.18, 'sawtooth', 0.13); tone(165, 0.16, 0.32, 'sawtooth', 0.13); },
  theirs() { tone(330, 0, 0.14, 'triangle', 0.12); tone(262, 0.13, 0.24, 'triangle', 0.12); },
  tick() { tone(900, 0, 0.04, 'square', 0.05); },
  slam() { tone(150, 0, 0.28, 'triangle', 0.26, 48); },
  win() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.24, 'triangle', 0.18)); },
  lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, i * 0.18, 0.32, 'triangle', 0.14)); },
};
