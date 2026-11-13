import React, { useEffect, useRef, useState } from 'react';
import { GameProps, OverScreen, StartScreen } from './gameKit';
import { Fx, ReadyOverlay, Stage, clamp, glowText, rand, sfx, useGameLoop, useLogicalCanvas, useReady } from './arcadeKit';

// Binary Blaster: drones carrying numbers dive at your base. Flip the bit
// switches until they add up to a drone's number (the cannon locks on), then
// fire. Each new bit doubles the biggest number you can make.

const W = 480;
const H = 700;
const SHIELD_Y = H - 178;
const TURRET = { x: W / 2, y: H - 148 };
const PANEL_Y = H - 96;
const PANEL_H = 70;
const FIRE_W = 100;
const GAP = 8;
const KILLS_PER_WAVE = 6;

const bitsForWave = (wave: number) => (wave <= 2 ? 4 : wave <= 4 ? 5 : 6);

interface Drone { id: number; x: number; baseX: number; y: number; n: number; vy: number; phase: number; wobble: number; bonus: boolean; flash: number }
interface Laser { x1: number; y1: number; x2: number; y2: number; life: number }
interface Star { x: number; y: number; layer: number }

export interface BlasterResult { score: number; kills: number; wave: number; bestCombo: number; misses: number }

const newState = () => ({
  bits: 4,
  on: [false, false, false, false, false, false], // index = place (0 is the 1s bit)
  drones: [] as Drone[],
  nextId: 1,
  spawnIn: 0.6,
  wave: 1,
  waveKills: 0,
  kills: 0,
  score: 0,
  combo: 0,
  bestCombo: 0,
  misses: 0,
  lives: 3,
  lasers: [] as Laser[],
  aim: -Math.PI / 2,
  heat: 0,
  banner: { text: 'WAVE 1', sub: 'Make each number from 8, 4, 2 and 1', life: 2.4 },
  time: 0,
  dying: 0,
  ended: false,
  pressed: -1, // panel box being pressed, for a little feedback
  pressedFor: 0,
  stars: Array.from({ length: 90 }, (): Star => ({ x: Math.random() * W, y: Math.random() * H, layer: 1 + Math.floor(Math.random() * 3) })),
});

type State = ReturnType<typeof newState>;

const valueOf = (s: State) => s.on.slice(0, s.bits).reduce((sum, b, i) => sum + (b ? 2 ** i : 0), 0);

/** The drone the cannon would hit right now: lowest one showing the current value. */
const lockTarget = (s: State) => {
  const v = valueOf(s);
  if (v === 0) return null;
  let target: Drone | null = null;
  for (const d of s.drones) if (d.n === v && d.y > 10 && (!target || d.y > target.y)) target = d;
  return target;
};

const panelLayout = (bits: number) => {
  const area = W - 32 - FIRE_W - GAP;
  const bw = (area - GAP * (bits - 1)) / bits;
  const boxes = Array.from({ length: bits }, (_, i) => ({ x: 16 + i * (bw + GAP), w: bw, place: bits - 1 - i }));
  return { boxes, fire: { x: W - 16 - FIRE_W, w: FIRE_W } };
};

const BlasterRun: React.FC<{ onEnd: (r: BlasterResult) => void }> = ({ onEnd }) => {
  const { ref, toLogical } = useLogicalCanvas(W, H);
  const s = useRef(newState()).current;
  const fx = useRef(new Fx()).current;
  const ready = useReady(3);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  const toggle = (place: number) => {
    if (place >= s.bits || s.dying) return;
    s.on[place] = !s.on[place];
    sfx.tone(s.on[place] ? 520 + place * 90 : 300, 0.05, { type: 'square', vol: 0.1 });
  };

  const clearBits = () => {
    s.on = s.on.map(() => false);
  };

  const fire = () => {
    if (s.dying || ready > 0 || s.heat > 0) return;
    const target = lockTarget(s);
    if (!target) {
      s.misses += 1;
      s.combo = 0;
      s.heat = 0.6;
      sfx.tone(140, 0.2, { type: 'sawtooth', vol: 0.2 });
      fx.float(TURRET.x, TURRET.y - 50, valueOf(s) === 0 ? 'SET SOME BITS' : `NO DRONE SHOWS ${valueOf(s)}`, '#fb7185', 15);
      return;
    }
    s.combo += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const mult = Math.min(5, 1 + Math.floor((s.combo - 1) / 3));
    const points = 10 * s.wave * mult * (target.bonus ? 2 : 1);
    s.score += points;
    s.kills += 1;
    s.waveKills += 1;
    s.lasers.push({ x1: TURRET.x, y1: TURRET.y - 22, x2: target.x, y2: target.y, life: 0.18 });
    s.drones = s.drones.filter((d) => d !== target);
    fx.burst(target.x, target.y, target.bonus ? '#facc15' : '#f472b6', 30, 280, 4);
    fx.burst(target.x, target.y, '#a5f3fc', 14, 160, 3);
    fx.float(target.x, target.y - 20, `+${points}${mult > 1 ? `  x${mult}` : ''}`, target.bonus ? '#facc15' : '#fff', 18);
    fx.shake(5, 0.15);
    sfx.laser();
    sfx.noise(0.25, 0.25);
    clearBits();

    if (s.waveKills >= KILLS_PER_WAVE) {
      s.wave += 1;
      s.waveKills = 0;
      const nb = bitsForWave(s.wave);
      if (nb > s.bits) {
        s.bits = nb;
        s.banner = { text: `NEW BIT: ${2 ** (nb - 1)}`, sub: `Now you can make every number up to ${2 ** nb - 1}`, life: 2.8 };
      } else {
        s.banner = { text: `WAVE ${s.wave}`, sub: 'Faster drones, more of them', life: 2.2 };
      }
      sfx.levelUp();
    }
  };

  // Keyboard: 1..n flip the switches left to right, space/enter fires, backspace clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      sfx.unlock();
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= s.bits) {
        const place = s.bits - n;
        toggle(place);
        s.pressed = n - 1;
        s.pressedFor = 0.1;
      } else if (e.key === ' ' || e.key === 'Enter') {
        fire();
        s.pressed = 99;
        s.pressedFor = 0.1;
      } else if (e.key === 'Backspace' || e.key === '0' || e.key.toLowerCase() === 'c') {
        clearBits();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onPointer = (e: React.PointerEvent) => {
    sfx.unlock();
    const { x, y } = toLogical(e.clientX, e.clientY);
    if (y >= PANEL_Y - 6 && y <= PANEL_Y + PANEL_H + 6) {
      const { boxes, fire: f } = panelLayout(s.bits);
      if (x >= f.x) {
        fire();
        s.pressed = 99;
        s.pressedFor = 0.1;
        return;
      }
      const i = boxes.findIndex((b) => x >= b.x - GAP / 2 && x <= b.x + b.w + GAP / 2);
      if (i >= 0) {
        toggle(boxes[i].place);
        s.pressed = i;
        s.pressedFor = 0.1;
      }
    } else if (Math.abs(y - TURRET.y) < 34 && Math.abs(x - (TURRET.x + 92)) < 50) {
      clearBits();
    }
  };

  const spawn = () => {
    const max = 2 ** s.bits - 1;
    const onScreen = new Set(s.drones.map((d) => d.n));
    let n = 1 + Math.floor(Math.random() * max);
    for (let tries = 0; tries < 8 && onScreen.has(n); tries += 1) n = 1 + Math.floor(Math.random() * max);
    let x = rand(46, W - 46);
    for (let tries = 0; tries < 6 && s.drones.some((d) => d.y < 80 && Math.abs(d.x - x) < 70); tries += 1) x = rand(46, W - 46);
    const bonus = s.wave >= 2 && Math.random() < 0.1;
    s.drones.push({
      id: s.nextId++,
      x,
      baseX: x,
      y: -30,
      n,
      vy: (bonus ? 1.6 : 1) * (22 + s.wave * 5 + rand(0, 10)),
      phase: rand(0, Math.PI * 2),
      wobble: s.wave >= 3 ? rand(0, 26) : 0,
      bonus,
      flash: 0,
    });
  };

  const update = (dt: number) => {
    s.time += dt;
    for (const st of s.stars) {
      st.y += st.layer * st.layer * 14 * dt;
      if (st.y > H) { st.y = 0; st.x = Math.random() * W; }
    }
    if (ready <= 0) s.banner.life -= dt;
    s.heat = Math.max(0, s.heat - dt);
    s.pressedFor = Math.max(0, s.pressedFor - dt);
    for (const l of s.lasers) l.life -= dt;
    s.lasers = s.lasers.filter((l) => l.life > 0);
    fx.update(dt);
    if (ready > 0 || s.ended) return;

    if (s.dying) {
      s.dying -= dt;
      if (s.dying <= 0) {
        s.ended = true;
        endRef.current({ score: s.score, kills: s.kills, wave: s.wave, bestCombo: s.bestCombo, misses: s.misses });
      }
      return;
    }

    s.spawnIn -= dt;
    const maxDrones = Math.min(8, 2 + s.wave);
    if (s.spawnIn <= 0 && s.drones.length < maxDrones) {
      spawn();
      s.spawnIn = Math.max(0.85, 3.0 - s.wave * 0.24) * rand(0.8, 1.2);
    }

    for (const d of s.drones) {
      d.y += d.vy * dt;
      d.phase += dt * 2;
      d.x = clamp(d.baseX + Math.sin(d.phase) * d.wobble, 30, W - 30);
    }
    const breached = s.drones.filter((d) => d.y >= SHIELD_Y);
    if (breached.length) {
      s.drones = s.drones.filter((d) => d.y < SHIELD_Y);
      for (const d of breached) {
        s.lives -= 1;
        s.combo = 0;
        fx.burst(d.x, SHIELD_Y, '#fb7185', 40, 320, 4);
        fx.float(d.x, SHIELD_Y - 30, `${d.n} = ${d.n.toString(2).padStart(s.bits, '0')}`, '#fda4af', 16);
      }
      fx.shake(14, 0.35);
      fx.hit();
      sfx.hurt();
      if (s.lives <= 0) {
        s.dying = 1.6;
        fx.burst(TURRET.x, TURRET.y, '#f472b6', 80, 420, 5);
        fx.burst(TURRET.x, TURRET.y, '#facc15', 40, 300, 4);
        fx.shake(22, 0.6);
        sfx.boom();
        sfx.gameOver();
      }
    }

    const t = lockTarget(s);
    const want = t ? Math.atan2(t.y - TURRET.y, t.x - TURRET.x) : -Math.PI / 2;
    s.aim += (want - s.aim) * Math.min(1, dt * 14);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Space
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0820');
    bg.addColorStop(0.7, '#160c2b');
    bg.addColorStop(1, '#25103a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (const st of s.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.2 + st.layer * 0.22})`;
      ctx.fillRect(st.x, st.y, st.layer * 0.9, st.layer * (st.layer === 3 ? 3 : 1));
    }

    fx.applyShake(ctx);

    // Perspective grid under the shield
    ctx.save();
    ctx.strokeStyle = 'rgba(167,139,250,0.18)';
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 20, SHIELD_Y);
      ctx.lineTo(W / 2 + i * 90, H);
      ctx.stroke();
    }
    const scroll = (s.time * 40) % 24;
    for (let y = SHIELD_Y + scroll; y < H; y += 24) {
      ctx.globalAlpha = (y - SHIELD_Y) / (H - SHIELD_Y);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    // Shield
    ctx.save();
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = s.lives > 1 ? 'rgba(34,211,238,0.85)' : 'rgba(251,113,133,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 8]);
    ctx.lineDashOffset = -s.time * 30;
    ctx.beginPath();
    ctx.moveTo(0, SHIELD_Y);
    ctx.lineTo(W, SHIELD_Y);
    ctx.stroke();
    ctx.restore();

    // Drones
    const target = lockTarget(s);
    for (const d of s.drones) {
      const color = d.bonus ? '#facc15' : '#f472b6';
      const danger = clamp((d.y - SHIELD_Y * 0.55) / (SHIELD_Y * 0.45), 0, 1);
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.shadowColor = danger > 0.6 ? '#fb7185' : color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(20,10,40,0.92)';
      ctx.strokeStyle = danger > 0.6 && Math.floor(s.time * 8) % 2 === 0 ? '#fb7185' : color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k += 1) {
        const a = (Math.PI / 3) * k + s.time * 0.6 * (d.id % 2 ? 1 : -1);
        ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // little thrusters
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(167,243,252,0.8)';
      ctx.fillRect(-12, -34 - Math.random() * 4, 3, 6);
      ctx.fillRect(9, -34 - Math.random() * 4, 3, 6);
      ctx.restore();
      glowText(ctx, String(d.n), d.x, d.y + 1, '#fff', d.n > 9 ? 20 : 22);
    }

    // Lock-on reticle
    if (target) {
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.rotate(s.time * 2);
      ctx.strokeStyle = '#4ade80';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      const r = 38 + Math.sin(s.time * 10) * 3;
      for (let k = 0; k < 4; k += 1) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(r, -10);
        ctx.lineTo(r, -r * 0.35 + 4);
        ctx.moveTo(r, 10);
        ctx.lineTo(r, r * 0.35 - 4);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = 'rgba(74,222,128,0.35)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(TURRET.x, TURRET.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.restore();
    }

    // Lasers
    for (const l of s.lasers) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = l.life / 0.18;
      ctx.strokeStyle = '#f0abfc';
      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = 24;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // Turret
    if (!(s.dying && s.lives <= 0)) {
      ctx.save();
      ctx.translate(TURRET.x, TURRET.y);
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#1e1338';
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 8, 30, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.rotate(s.aim + Math.PI / 2);
      ctx.fillStyle = s.heat > 0 ? '#fb7185' : target ? '#4ade80' : '#f472b6';
      ctx.shadowColor = ctx.fillStyle as string;
      ctx.fillRect(-5, -36, 10, 34);
      ctx.restore();
    }

    // Value readout + clear
    const v = valueOf(s);
    ctx.save();
    ctx.font = '800 13px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const sum = s.on.slice(0, s.bits).map((b, i) => (b ? 2 ** i : 0)).filter(Boolean).reverse();
    ctx.fillText(sum.length > 1 ? sum.join(' + ') : '', TURRET.x - 44, TURRET.y + 4);
    ctx.restore();
    glowText(ctx, `= ${v}`, TURRET.x + 70, TURRET.y + 2, target ? '#4ade80' : '#fff', 26);
    if (v > 0) {
      ctx.save();
      ctx.font = '700 10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'center';
      ctx.fillText('tap to clear', TURRET.x + 70, TURRET.y + 24);
      ctx.restore();
    }

    fx.draw(ctx);
    ctx.restore(); // shake

    // Bit panel
    const { boxes, fire: f } = panelLayout(s.bits);
    ctx.fillStyle = 'rgba(8,6,16,0.85)';
    ctx.fillRect(0, PANEL_Y - 26, W, H - PANEL_Y + 26);
    boxes.forEach((b, i) => {
      const lit = s.on[b.place];
      const press = s.pressed === i && s.pressedFor > 0 ? 2 : 0;
      ctx.save();
      ctx.font = '800 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = lit ? '#f9a8d4' : 'rgba(255,255,255,0.5)';
      ctx.fillText(String(2 ** b.place), b.x + b.w / 2, PANEL_Y - 11);
      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = lit ? 22 : 0;
      ctx.fillStyle = lit ? '#db2777' : '#1a1428';
      ctx.strokeStyle = lit ? '#fbcfe8' : 'rgba(167,139,250,0.45)';
      ctx.lineWidth = 2;
      ctx.fillRect(b.x + press, PANEL_Y + press, b.w - press * 2, PANEL_H - press * 2);
      ctx.strokeRect(b.x + press, PANEL_Y + press, b.w - press * 2, PANEL_H - press * 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = lit ? '#fff' : 'rgba(255,255,255,0.35)';
      ctx.font = '800 30px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(lit ? '1' : '0', b.x + b.w / 2, PANEL_Y + PANEL_H / 2 - 3);
      ctx.font = '700 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(`key ${i + 1}`, b.x + b.w / 2, PANEL_Y + PANEL_H - 9);
      ctx.restore();
    });
    ctx.save();
    const press = s.pressed === 99 && s.pressedFor > 0 ? 2 : 0;
    const armed = !!target && s.heat <= 0;
    ctx.shadowColor = armed ? '#4ade80' : '#a78bfa';
    ctx.shadowBlur = armed ? 24 + Math.sin(s.time * 12) * 8 : 6;
    ctx.fillStyle = s.heat > 0 ? '#3f1520' : armed ? '#15803d' : '#2a1d4a';
    ctx.fillRect(f.x + press, PANEL_Y + press, f.w - press * 2, PANEL_H - press * 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '900 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIRE', f.x + f.w / 2, PANEL_Y + PANEL_H / 2 - 4);
    ctx.font = '700 9px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('space', f.x + f.w / 2, PANEL_Y + PANEL_H - 9);
    ctx.restore();

    // HUD (over a fade so drones entering from the top don't hide the score)
    ctx.save();
    const fade = ctx.createLinearGradient(0, 0, 0, 80);
    fade.addColorStop(0, 'rgba(8,6,20,0.9)');
    fade.addColorStop(1, 'rgba(8,6,20,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, 80);
    ctx.font = '800 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textBaseline = 'top';
    ctx.fillText('SCORE', 16, 14);
    ctx.fillText('WAVE', 150, 14);
    ctx.fillText('SHIELD', 230, 14);
    ctx.font = '900 24px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(s.score), 16, 28);
    ctx.fillText(String(s.wave), 150, 28);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < s.lives ? '#22d3ee' : 'rgba(255,255,255,0.15)';
      ctx.fillRect(230 + i * 22, 34, 16, 14);
    }
    if (s.combo >= 2) {
      const mult = Math.min(5, 1 + Math.floor((s.combo - 1) / 3));
      ctx.font = '900 14px Inter, sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.fillText(`COMBO ${s.combo}${mult > 1 ? `  x${mult}` : ''}`, 16, 58);
    }
    ctx.restore();

    if (s.banner.life > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(s.banner.life, 0, 1);
      glowText(ctx, s.banner.text, W / 2, H * 0.36, '#f9a8d4', 38, 900);
      ctx.font = '700 14px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      ctx.fillText(s.banner.sub, W / 2, H * 0.36 + 34);
      ctx.restore();
    }

    fx.drawFlash(ctx, W, H);
  };

  useGameLoop(true, (dt) => {
    update(dt);
    const ctx = ref.current?.getContext('2d');
    if (ctx) draw(ctx);
  });

  return (
    <Stage aspect={W / H} maxWidth={500}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" onPointerDown={onPointer} />
      <ReadyOverlay count={ready} title="Binary Blaster" hint="Flip the switches to make a drone's number, then FIRE" />
    </Stage>
  );
};

const BinaryBlaster: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [result, setResult] = useState<BlasterResult | null>(null);

  if (phase === 'play') {
    return (
      <BlasterRun
        onEnd={(r) => {
          setResult(r);
          setPhase('over');
          onFinish(r.score);
        }}
      />
    );
  }

  if (phase === 'over' && result) {
    return (
      <OverScreen
        score={result.score}
        best={best}
        lines={[
          `Drones destroyed: ${result.kills}`,
          `Reached wave ${result.wave} (${bitsForWave(result.wave)} bits, numbers up to ${2 ** bitsForWave(result.wave) - 1})`,
          `Best combo: ${result.bestCombo}`,
          `Missed shots: ${result.misses}`,
        ]}
        lesson="Each switch is a bit, worth double the one to its right: 1, 2, 4, 8, 16… Every whole number is one mix of them, which is how a computer stores every number as 1s and 0s. Adding one more bit doubles how high you can count."
        onAgain={() => { sfx.unlock(); setPhase('play'); }}
      />
    );
  }

  return (
    <StartScreen
      concept="Binary numbers"
      howTo={[
        'Drones carrying numbers dive at your base. If one crosses the shield line, you lose a shield. Lose three and it is over.',
        'The switches at the bottom are bits worth 8, 4, 2 and 1. Flip them on until they add up to a drone\'s number. 13 is 8 + 4 + 1, so 1101.',
        'When the total matches a drone, your cannon locks on (green). Hit FIRE. Firing with no lock breaks your combo.',
        'Keys 1–6 flip the switches, Space fires, Backspace clears. On a phone, just tap. Every few waves you get a new, bigger bit.',
      ]}
      onStart={() => { sfx.unlock(); setPhase('play'); }}
    />
  );
};

export default BinaryBlaster;
