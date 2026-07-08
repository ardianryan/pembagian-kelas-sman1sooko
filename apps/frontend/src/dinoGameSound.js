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

export async function unlockGameAudio() {
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
  duration = 0.12,
  type = 'triangle',
  volume = 0.08,
  detune = 0,
}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.detune.setValueAtTime(detune, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export async function playJumpSound() {
  if (!shouldPlaySound()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    scheduleTone(ctx, { frequency: 420, start: t, duration: 0.08, type: 'sine', volume: 0.07 });
    scheduleTone(ctx, { frequency: 620, start: t + 0.04, duration: 0.1, type: 'triangle', volume: 0.06 });
  } catch {
    // ignore
  }
}

export async function playScoreSound(streak = 1) {
  if (!shouldPlaySound()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const base = 520 + Math.min(streak, 8) * 35;
    scheduleTone(ctx, { frequency: base, start: t, duration: 0.06, type: 'sine', volume: 0.05 });
    scheduleTone(ctx, { frequency: base * 1.25, start: t + 0.03, duration: 0.07, type: 'triangle', volume: 0.04 });
  } catch {
    // ignore
  }
}

export async function playMilestoneSound() {
  if (!shouldPlaySound()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      scheduleTone(ctx, {
        frequency,
        start: t + index * 0.07,
        duration: 0.14,
        type: index % 2 === 0 ? 'triangle' : 'sine',
        volume: 0.07,
      });
    });
  } catch {
    // ignore
  }
}

export async function playCrashSound() {
  if (!shouldPlaySound()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.35);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  } catch {
    // ignore
  }
}