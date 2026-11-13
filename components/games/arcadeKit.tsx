import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Shared engine for the Arcade games: a fixed-resolution canvas that scales to
// fit (and goes fullscreen), a frame loop that pauses when the tab is hidden,
// synthesized sound effects, particles, floating text and screen shake.

/* ---------- sound ---------- */

const MUTE_KEY = 'games_muted';

const readMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
};

/** Tiny synth: every effect is made on the fly, so there are no audio files to load. */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = readMuted();

  private ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Call from a tap or key press so mobile browsers allow audio. */
  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch { /* not remembered */ }
  }

  tone(freq: number, dur = 0.12, opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number } = {}) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    gain.gain.setValueAtTime(opts.vol ?? 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur = 0.3, vol = 0.3, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  // Named effects shared by the games, so they sound like one set.
  click() { this.tone(660, 0.05, { type: 'square', vol: 0.12 }); }
  laser() { this.tone(1400, 0.16, { type: 'sawtooth', vol: 0.16, slide: 180 }); }
  boom() { this.noise(0.45, 0.45); this.tone(110, 0.3, { type: 'sine', vol: 0.4, slide: 40 }); }
  good() { this.tone(523, 0.08, { type: 'triangle', vol: 0.22 }); this.tone(784, 0.14, { type: 'triangle', vol: 0.22, delay: 0.07 }); }
  coin() { this.tone(988, 0.05, { type: 'square', vol: 0.1 }); this.tone(1319, 0.1, { type: 'square', vol: 0.1, delay: 0.05 }); }
  hurt() { this.tone(220, 0.35, { type: 'sawtooth', vol: 0.3, slide: 55 }); this.noise(0.2, 0.25); }
  levelUp() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.2, delay: i * 0.08 })); }
  gameOver() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.25, delay: i * 0.16 })); }
}

export const sfx = new Sfx();

/* ---------- maths ---------- */

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/* ---------- effects ---------- */

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }
interface FloatText { x: number; y: number; text: string; color: string; life: number; size: number }

export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  shakeTime = 0;
  shakeMag = 0;
  flash = 0;
  flashColor = '255,60,90';

  burst(x: number, y: number, color: string, count = 18, speed = 220, size = 3) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      const life = 0.35 + Math.random() * 0.45;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: size * (0.5 + Math.random()), color });
    }
  }

  float(x: number, y: number, text: string, color = '#fff', size = 18) {
    this.texts.push({ x, y, text, color, life: 1, size });
  }

  shake(mag = 8, time = 0.25) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  hit(color = '255,60,90', amount = 0.45) {
    this.flash = amount;
    this.flashColor = color;
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.2 * dt;
      p.vy *= 1 - 2.2 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 40 * dt;
      t.life -= dt * 0.9;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.flash = Math.max(0, this.flash - dt * 1.6);
  }

  /** Translate for screen shake; pair with ctx.restore(). */
  applyShake(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.shakeTime > 0) {
      const m = this.shakeMag * (this.shakeTime / 0.25);
      ctx.translate(rand(-m, m), rand(-m, m));
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = clamp(t.life * 1.5, 0, 1);
      ctx.font = `800 ${t.size}px Inter, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  drawFlash(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.flash <= 0) return;
    ctx.fillStyle = `rgba(${this.flashColor},${this.flash * 0.5})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Draws text with a soft neon glow. */
export const glowText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number, weight = 800) => {
  ctx.save();
  ctx.font = `${weight} ${size}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.6;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
};

/* ---------- loop ---------- */

/**
 * Runs `step(dt)` every animation frame while `running`. Pauses (and tells you)
 * when the tab is hidden, and caps dt so a long stall can't teleport things.
 */
export const useGameLoop = (running: boolean, step: (dt: number) => void) => {
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      try {
        stepRef.current(dt);
      } catch (err) {
        // One bad frame shouldn't freeze the game; report it and carry on.
        console.error('[arcade] frame failed', err);
      }
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [running]);
};

/* ---------- stage ---------- */

const IconBtn: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="flex h-8 w-8 items-center justify-center bg-black/50 text-white/80 backdrop-blur hover:bg-black/70 hover:text-white"
  >
    {children}
  </button>
);

/**
 * A game screen: keeps a fixed aspect ratio, has mute and fullscreen buttons,
 * and stops the page scrolling while you play with arrows / space / touch.
 * Put the canvas (or a three.js mount) and any overlay inside as children.
 */
export const Stage: React.FC<{ aspect: number; maxWidth?: number; children: React.ReactNode }> = ({ aspect, maxWidth = 560, children }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(sfx.muted);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onFs);
    const block = (e: KeyboardEvent) => {
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !(e.target instanceof HTMLInputElement)) e.preventDefault();
    };
    window.addEventListener('keydown', block, { passive: false });
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('keydown', block);
    };
  }, []);

  const toggleFull = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => { /* not allowed here */ });
  }, []);

  return (
    <div
      ref={wrapRef}
      className={full ? 'flex h-full w-full items-center justify-center bg-black' : 'mx-auto w-full'}
      // Never taller than the window (minus the app header), so the whole game is in view.
      style={full ? undefined : { maxWidth: `min(${maxWidth}px, calc((100svh - 150px) * ${aspect}))` }}
    >
      <div
        className="relative w-full select-none overflow-hidden bg-[#07060c] shadow-[0_0_0_2px_var(--ch-rule)]"
        style={{ aspectRatio: String(aspect), maxHeight: full ? '100vh' : undefined, width: full ? `min(100vw, ${100 * aspect}vh)` : undefined, touchAction: 'none' }}
      >
        {children}
        <div className="absolute right-2 top-2 z-20 flex gap-1">
          <IconBtn label={muted ? 'Sound on' : 'Mute'} onClick={() => { sfx.setMuted(!muted); setMuted(!muted); }}>
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m23 9-6 6M17 9l6 6" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></svg>
            )}
          </IconBtn>
          <IconBtn label={full ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFull}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {full ? <path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5" /> : <path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5" />}
            </svg>
          </IconBtn>
        </div>
      </div>
    </div>
  );
};

/**
 * A canvas drawn at a fixed logical size (w × h) that stays sharp at any
 * display size. Returns the canvas ref and a helper to turn pointer events
 * into logical coordinates.
 */
export const useLogicalCanvas = (w: number, h: number) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [w, h]);

  const toLogical = useCallback((clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((clientX - rect.left) / rect.width) * w, y: ((clientY - rect.top) / rect.height) * h };
  }, [w, h]);

  return { ref, toLogical };
};

/** "Get ready" countdown overlay shown before a run starts. */
export const useReady = (seconds = 3) => {
  const [count, setCount] = useState(seconds);
  useEffect(() => {
    if (count <= 0) return;
    sfx.tone(count === 1 ? 880 : 440, 0.12, { type: 'triangle', vol: 0.2 });
    const id = window.setTimeout(() => {
      setCount((c) => c - 1);
      if (count === 1) sfx.tone(1320, 0.25, { type: 'triangle', vol: 0.22 });
    }, 700);
    return () => window.clearTimeout(id);
  }, [count]);
  return count;
};

export const ReadyOverlay: React.FC<{ count: number; title: string; hint: string }> = ({ count, title, hint }) =>
  count > 0 ? (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/55 text-center text-white">
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-pink-300">{title}</p>
      <motion.p
        key={count}
        initial={{ scale: 1.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="text-[88px] font-extrabold leading-none"
      >
        {count}
      </motion.p>
      <p className="mt-4 max-w-[80%] text-[13px] text-white/75">{hint}</p>
    </div>
  ) : null;
