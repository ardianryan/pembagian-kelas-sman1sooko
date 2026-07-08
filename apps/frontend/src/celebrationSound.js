let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function shouldPlaySound() {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function unlockCelebrationAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx.state === 'running';
}

function scheduleTone(ctx, {
  frequency,
  start,
  duration = 0.18,
  type = 'triangle',
  volume = 0.1,
  detune = 0,
}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.detune.setValueAtTime(detune, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.setValueAtTime(volume * 0.85, start + duration * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function scheduleChord(ctx, frequencies, start, duration, volume = 0.07) {
  frequencies.forEach((frequency, index) => {
    scheduleTone(ctx, {
      frequency,
      start: start + index * 0.01,
      duration,
      type: index === 0 ? 'triangle' : 'sine',
      volume: volume - index * 0.01,
    });
  });
}

function playDrum(ctx, start, frequency = 110) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, start + 0.12);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 0.2);
}

const WELCOME_MELODY = [
  { f: 523.25, d: 0.16 },
  { f: 659.25, d: 0.16 },
  { f: 783.99, d: 0.16 },
  { f: 1046.5, d: 0.28 },
  { f: 987.77, d: 0.14 },
  { f: 1046.5, d: 0.14 },
  { f: 1174.66, d: 0.14 },
  { f: 1318.51, d: 0.36 },
];

const BURST_MELODY = [
  { f: 659.25, d: 0.12 },
  { f: 783.99, d: 0.12 },
  { f: 987.77, d: 0.12 },
  { f: 1174.66, d: 0.22 },
  { f: 1318.51, d: 0.24 },
];

export async function playCelebrationSound(variant = 'welcome') {
  if (!shouldPlaySound()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') return;

    const melody = variant === 'burst' ? BURST_MELODY : WELCOME_MELODY;
    const t0 = ctx.currentTime + 0.02;
    let cursor = t0;

    playDrum(ctx, t0);
    playDrum(ctx, t0 + 0.42, 98);
    if (variant === 'welcome') {
      playDrum(ctx, t0 + 0.84, 92);
    }

    melody.forEach((note, index) => {
      scheduleTone(ctx, {
        frequency: note.f,
        start: cursor,
        duration: note.d,
        type: index % 2 === 0 ? 'triangle' : 'sine',
        volume: variant === 'burst' ? 0.11 : 0.1,
      });
      cursor += note.d * 0.82;
    });

    scheduleChord(ctx, [1046.5, 1318.51, 1567.98], cursor + 0.04, 0.45, 0.08);

    [1760, 2093, 2637].forEach((frequency, index) => {
      scheduleTone(ctx, {
        frequency,
        start: cursor + 0.18 + index * 0.07,
        duration: 0.12,
        type: 'sine',
        volume: 0.045,
        detune: index * 4,
      });
    });
  } catch {
    // Browser blocked audio or Web Audio unavailable — fail silently.
  }
}