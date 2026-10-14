// Tiny synthesized sound effects (no audio files). The AudioContext is created
// on the first user gesture, as browsers require, and resumed on later ones
// (iOS suspends it when the app goes to the background).
const PENTA = [0, 2, 4, 7, 9]; // major pentatonic, semitones

export function createSfx() {
  let ctx = null;
  let master = null;
  let muted = false;
  let lastCoin = 0;
  try {
    muted = localStorage.getItem('mb:muted') === '1';
  } catch {}

  function ensure() {
    if (ctx) {
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      return ctx;
    }
    if (typeof AudioContext === 'undefined') return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    return ctx;
  }
  for (const type of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(type, ensure, { passive: true });

  function tone(freq, { at = 0, dur = 0.14, type = 'sine', gain = 0.3, slide = 0 } = {}) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  const note = (step, base = 392) => {
    const oct = Math.floor(step / PENTA.length);
    const semi = PENTA[((step % PENTA.length) + PENTA.length) % PENTA.length] + oct * 12;
    return base * 2 ** (semi / 12);
  };

  return {
    drop(tier) {
      tone(300 - tier * 12, { dur: 0.09, type: 'triangle', gain: 0.18, slide: 0.7 });
    },
    land(impact) {
      if (impact < 6) return;
      tone(140, { dur: 0.07, type: 'sine', gain: Math.min(0.25, impact * 0.012), slide: 0.6 });
    },
    merge(tier, combo) {
      const f = note(tier + Math.min(combo - 1, 6));
      tone(f, { dur: 0.16, type: 'triangle', gain: 0.26 });
      tone(f * 2, { at: 0.05, dur: 0.12, type: 'sine', gain: 0.12 });
    },
    milestone() {
      [0, 2, 4, 5, 7].forEach((s, i) => tone(note(s + 5), { at: i * 0.08, dur: 0.22, type: 'triangle', gain: 0.25 }));
    },
    kill(boss) {
      tone(boss ? 220 : 520 + Math.random() * 160, { dur: boss ? 0.4 : 0.07, type: boss ? 'triangle' : 'square', gain: boss ? 0.28 : 0.05, slide: boss ? 0.5 : 1.4 });
    },
    coin() {
      // many coins land together: one chime per 60 ms is plenty
      const now = performance.now();
      if (now - lastCoin < 60) return;
      lastCoin = now;
      const f = 1320 + Math.random() * 180;
      tone(f, { dur: 0.06, type: 'square', gain: 0.035 });
      tone(f * 1.5, { at: 0.04, dur: 0.08, type: 'sine', gain: 0.05 });
    },
    deny() {
      tone(150, { dur: 0.12, type: 'square', gain: 0.06 });
      tone(120, { at: 0.08, dur: 0.12, type: 'square', gain: 0.06 });
    },
    hurt() {
      tone(160, { dur: 0.22, type: 'sawtooth', gain: 0.12, slide: 0.5 });
    },
    choose(stage) {
      [0, 2, 4].forEach((s, i) => tone(note(s + stage * 3), { at: i * 0.06, dur: 0.18, type: 'triangle', gain: 0.22 }));
    },
    battle(boss) {
      tone(boss ? 98 : 196, { dur: 0.35, type: 'triangle', gain: 0.2, slide: boss ? 1.5 : 1.25 });
    },
    gameover() {
      [4, 2, 0, -2].forEach((s, i) => tone(note(s), { at: i * 0.13, dur: 0.25, type: 'sine', gain: 0.22 }));
    },
    toggle() {
      muted = !muted;
      ensure();
      if (master) master.gain.value = muted ? 0 : 0.55;
      try {
        localStorage.setItem('mb:muted', muted ? '1' : '0');
      } catch {}
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
