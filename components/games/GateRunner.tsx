import React, { useEffect, useRef, useState } from 'react';
import { GameProps, OverScreen, StartScreen, pickOne } from './gameKit';
import { Fx, ReadyOverlay, Stage, clamp, glowText, rand, sfx, useGameLoop, useLogicalCanvas, useReady } from './arcadeKit';

// Gate Runner: a robot sprints across Kampala's hills at night. Laser doors
// block the way, each wired to a logic gate (AND, OR, NOT, XOR…). Flip your
// two switches, A and B, so the gate outputs 1 and the door opens. Jump the
// spikes on the way.

const W = 640;
const H = 400;
const GROUND = 300;
const PANEL_Y = 334;
const PLAYER_X = 130;
const PW = 26;
const PH = 40;

type Expr = { label: string; fn: (a: boolean, b: boolean) => boolean; hint: string };

const E = {
  A: { label: 'A', fn: (a: boolean) => a, hint: 'A must be ON' },
  B: { label: 'B', fn: (_a: boolean, b: boolean) => b, hint: 'B must be ON' },
  NOTA: { label: 'NOT A', fn: (a: boolean) => !a, hint: 'NOT flips it: A must be OFF' },
  NOTB: { label: 'NOT B', fn: (_a: boolean, b: boolean) => !b, hint: 'NOT flips it: B must be OFF' },
  AND: { label: 'A AND B', fn: (a: boolean, b: boolean) => a && b, hint: 'AND needs BOTH on' },
  OR: { label: 'A OR B', fn: (a: boolean, b: boolean) => a || b, hint: 'OR needs at least one on' },
  XOR: { label: 'A XOR B', fn: (a: boolean, b: boolean) => a !== b, hint: 'XOR needs exactly ONE on' },
  NAND: { label: 'NOT (A AND B)', fn: (a: boolean, b: boolean) => !(a && b), hint: 'Anything except both on' },
  NOR: { label: 'NOT (A OR B)', fn: (a: boolean, b: boolean) => !(a || b), hint: 'Both must be OFF' },
  ANDNOT: { label: 'A AND NOT B', fn: (a: boolean, b: boolean) => a && !b, hint: 'A on, B off' },
  NOTAORB: { label: 'NOT A OR B', fn: (a: boolean, b: boolean) => !a || b, hint: 'A off, or B on' },
  XNOR: { label: 'NOT (A XOR B)', fn: (a: boolean, b: boolean) => a === b, hint: 'A and B must be the same' },
} satisfies Record<string, Expr>;

const exprFor = (doors: number): Expr => {
  if (doors < 4) return pickOne([E.A, E.B, E.NOTA, E.AND, E.OR]);
  if (doors < 9) return pickOne([E.NOTB, E.AND, E.OR, E.XOR, E.NAND, E.NOR]);
  return pickOne([E.XOR, E.NAND, E.NOR, E.ANDNOT, E.NOTAORB, E.XNOR]);
};

interface Door { x: number; expr: Expr; hidden: boolean; done: boolean; open: boolean; flash: number }
interface Spike { x: number; w: number; done: boolean }
interface Coin { x: number; y: number; got: boolean }

export interface GateResult { score: number; doors: number; crashes: number; coins: number; distance: number }

const buildSkyline = () => {
  const hills = Array.from({ length: 7 }, (_, i) => ({ x: i * 190 + rand(-30, 30), r: rand(110, 170) }));
  const buildings = Array.from({ length: 22 }, (_, i) => ({ x: i * 62, w: rand(34, 56), h: rand(40, 130), lit: Array.from({ length: 12 }, () => Math.random() < 0.35) }));
  const stars = Array.from({ length: 60 }, () => ({ x: rand(0, W), y: rand(0, 170), t: rand(0, 6) }));
  return { hills, buildings, stars };
};

const GateRun: React.FC<{ onEnd: (r: GateResult) => void }> = ({ onEnd }) => {
  const { ref, toLogical } = useLogicalCanvas(W, H);
  const fx = useRef(new Fx()).current;
  const ready = useReady(3);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const sky = useRef(buildSkyline()).current;

  const s = useRef({
    a: false,
    b: false,
    y: GROUND - PH,
    vy: 0,
    onGround: true,
    speed: 210,
    dist: 0,
    time: 0,
    doors: [] as Door[],
    spikes: [] as Spike[],
    coins: [] as Coin[],
    nextDoorAt: 520,
    nextThingAt: 380,
    passed: 0,
    crashes: 0,
    coinCount: 0,
    lives: 3,
    invuln: 0,
    score: 0,
    dying: 0,
    ended: false,
    note: { text: '', life: 0, good: false },
    banner: { text: 'RUN!', sub: 'Flip A and B to make each door\'s gate output 1', life: 2.6 },
    press: { a: 0, b: 0, j: 0 },
  }).current;

  const jump = () => {
    if (s.dying || ready > 0) return;
    if (s.onGround) {
      s.vy = -600;
      s.onGround = false;
      sfx.tone(380, 0.12, { type: 'square', vol: 0.12, slide: 760 });
    }
  };
  const flip = (which: 'a' | 'b') => {
    if (s.dying) return;
    s[which] = !s[which];
    s.press[which] = 0.12;
    sfx.tone(s[which] ? 880 : 330, 0.06, { type: 'square', vol: 0.12 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      sfx.unlock();
      const k = e.key.toLowerCase();
      if (k === 'a' || k === '1' || k === 'arrowleft') flip('a');
      else if (k === 'b' || k === '2' || k === 'arrowright') flip('b');
      else if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'enter') { s.press.j = 0.12; jump(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Panel: [A] [B] ............ [JUMP]; tapping anywhere above the panel also jumps.
  const BTN = { a: { x: 14, w: 96 }, b: { x: 120, w: 96 }, j: { x: W - 170, w: 156 } };
  const onPointer = (e: React.PointerEvent) => {
    sfx.unlock();
    const { x, y } = toLogical(e.clientX, e.clientY);
    if (y >= PANEL_Y) {
      if (x >= BTN.a.x && x <= BTN.a.x + BTN.a.w) flip('a');
      else if (x >= BTN.b.x && x <= BTN.b.x + BTN.b.w) flip('b');
      else if (x >= BTN.j.x - 20) { s.press.j = 0.12; jump(); }
    } else {
      s.press.j = 0.12;
      jump();
    }
  };

  const crash = (text: string) => {
    s.lives -= 1;
    s.crashes += 1;
    s.invuln = 1.3;
    fx.shake(14, 0.35);
    fx.hit();
    fx.burst(PLAYER_X + PW / 2, s.y + PH / 2, '#fb7185', 30, 280, 4);
    sfx.hurt();
    s.note = { text, life: 3, good: false };
    if (s.lives <= 0) {
      s.dying = 1.7;
      fx.burst(PLAYER_X + PW / 2, s.y + PH / 2, '#facc15', 60, 380, 5);
      sfx.boom();
      sfx.gameOver();
    }
  };

  const spawn = () => {
    // Doors on a schedule; spikes and coins in between, never right before a door.
    if (s.dist >= s.nextDoorAt) {
      s.doors.push({ x: W + 40, expr: exprFor(s.passed + s.doors.filter((d) => !d.done).length), hidden: s.passed >= 9 && Math.random() < 0.5, done: false, open: false, flash: 0 });
      s.nextDoorAt += clamp(980 - s.passed * 15, 760, 980);
      s.nextThingAt = Math.max(s.nextThingAt, s.dist + 260);
    }
    if (s.dist >= s.nextThingAt) {
      const roomBeforeDoor = s.nextDoorAt - s.dist;
      if (roomBeforeDoor > 280) {
        // No spikes until the first door has been reached: learn the switches first.
        if (Math.random() < 0.6 && (s.passed > 0 || s.crashes > 0 || s.dist > 1400)) {
          const w = Math.random() < 0.3 && s.passed > 3 ? 56 : 30;
          s.spikes.push({ x: W + 30, w, done: false });
        } else {
          const high = Math.random() < 0.5;
          for (let k = 0; k < 4; k += 1) {
            const arc = high ? Math.sin((k / 3) * Math.PI) * 60 : 0;
            s.coins.push({ x: W + 30 + k * 34, y: GROUND - 30 - arc - (high ? 40 : 0), got: false });
          }
        }
      }
      s.nextThingAt += rand(260, 420);
    }
  };

  useGameLoop(true, (dt) => {
    s.time += dt;
    fx.update(dt);
    if (ready <= 0) s.banner.life -= dt;
    s.note.life -= dt;
    s.invuln = Math.max(0, s.invuln - dt);
    for (const k of ['a', 'b', 'j'] as const) s.press[k] = Math.max(0, s.press[k] - dt);

    if (s.dying && !s.ended) {
      s.dying -= dt;
      if (s.dying <= 0) {
        s.ended = true;
        endRef.current({ score: Math.floor(s.score), doors: s.passed, crashes: s.crashes, coins: s.coinCount, distance: Math.floor(s.dist / 10) });
      }
    }
    const live = ready <= 0 && !s.dying;
    const speed = live ? s.speed : s.dying ? s.speed * Math.max(0, s.dying / 1.7) : 0;

    if (live) {
      s.speed = Math.min(420, 210 + s.time * 3.2);
      s.dist += speed * dt;
      s.score += speed * dt * 0.05;
      spawn();
    }

    // Physics
    if (!s.onGround) {
      s.vy += 1700 * dt;
      s.y += s.vy * dt;
      if (s.y >= GROUND - PH) {
        s.y = GROUND - PH;
        s.vy = 0;
        s.onGround = true;
      }
    }

    // World scroll + collisions
    for (const d of s.doors) {
      d.x -= speed * dt;
      d.open = d.expr.fn(s.a, s.b);
      d.flash = Math.max(0, d.flash - dt);
      if (!d.done && !s.dying && d.x <= PLAYER_X + PW) {
        d.done = true;
        if (d.open) {
          s.passed += 1;
          const level = s.passed <= 4 ? 1 : s.passed <= 9 ? 2 : 3;
          const pts = 50 * level;
          s.score += pts;
          d.flash = 0.4;
          fx.burst(d.x, GROUND - 90, '#4ade80', 30, 260, 4);
          fx.float(d.x, GROUND - 170, `${d.expr.label} = 1  +${pts}`, '#86efac', 17);
          sfx.good();
          if (s.passed === 4 || s.passed === 9) {
            s.banner = s.passed === 4
              ? { text: 'LEVEL 2', sub: 'New gates: XOR, NAND, NOR', life: 2.6 }
              : { text: 'LEVEL 3', sub: 'Some doors hide their light until the last moment', life: 3 };
            sfx.levelUp();
          }
        } else {
          crash(`${d.expr.label} was 0 with A=${s.a ? 1 : 0}, B=${s.b ? 1 : 0}. ${d.expr.hint}.`);
        }
      }
    }
    s.doors = s.doors.filter((d) => d.x > -60);
    const feet = s.y + PH;
    for (const sp of s.spikes) {
      sp.x -= speed * dt;
      if (!sp.done && !s.dying && s.invuln <= 0 && sp.x < PLAYER_X + PW - 4 && sp.x + sp.w > PLAYER_X + 4 && feet > GROUND - 22) {
        sp.done = true;
        crash('Spikes! Jump with Space or tap the screen.');
      }
    }
    s.spikes = s.spikes.filter((sp) => sp.x > -80);
    for (const c of s.coins) {
      c.x -= speed * dt;
      if (!c.got && Math.abs(c.x - (PLAYER_X + PW / 2)) < 22 && Math.abs(c.y - (s.y + PH / 2)) < 30) {
        c.got = true;
        s.coinCount += 1;
        s.score += 10;
        fx.burst(c.x, c.y, '#facc15', 8, 140, 3);
        sfx.coin();
      }
    }
    s.coins = s.coins.filter((c) => c.x > -20 && !c.got);

    /* ---------- draw ---------- */
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const sk = ctx.createLinearGradient(0, 0, 0, GROUND);
    sk.addColorStop(0, '#0a0624');
    sk.addColorStop(0.6, '#2a1050');
    sk.addColorStop(1, '#5b1a5e');
    ctx.fillStyle = sk;
    ctx.fillRect(0, 0, W, H);
    for (const st of sky.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.sin(s.time * 2 + st.t) * 0.3})`;
      ctx.fillRect(st.x, st.y, 1.6, 1.6);
    }
    // Moon
    ctx.save();
    ctx.shadowColor = '#fde68a';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(520, 70, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    fx.applyShake(ctx);
    // Far hills (slow parallax)
    const hillOff = (s.dist * 0.08) % 190;
    ctx.fillStyle = '#1d0f3d';
    for (let i = -1; i < 6; i += 1) {
      const h = sky.hills[(i + 7) % 7];
      ctx.beginPath();
      ctx.ellipse(i * 190 - hillOff + 60, GROUND + 20, h.r, h.r * 0.7, 0, Math.PI, 0);
      ctx.fill();
    }
    // City (mid parallax)
    const cityW = sky.buildings.length * 62;
    const cityOff = (s.dist * 0.3) % cityW;
    for (let pass = 0; pass < 2; pass += 1) {
      for (const bld of sky.buildings) {
        const x = bld.x - cityOff + pass * cityW;
        if (x > W || x + bld.w < 0) continue;
        ctx.fillStyle = '#140a2c';
        ctx.fillRect(x, GROUND - bld.h, bld.w, bld.h);
        for (let k = 0; k < bld.lit.length; k += 1) {
          if (!bld.lit[k]) continue;
          const wx = x + 6 + (k % 3) * ((bld.w - 12) / 3);
          const wy = GROUND - bld.h + 8 + Math.floor(k / 3) * 14;
          if (wy > GROUND - 8) continue;
          ctx.fillStyle = k % 4 === 0 ? 'rgba(244,114,182,0.8)' : 'rgba(253,230,138,0.75)';
          ctx.fillRect(wx, wy, 5, 6);
        }
      }
    }
    // Ground
    ctx.fillStyle = '#0d0820';
    ctx.fillRect(0, GROUND, W, PANEL_Y - GROUND);
    ctx.save();
    ctx.strokeStyle = '#f472b6';
    ctx.shadowColor = '#f472b6';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    ctx.lineTo(W, GROUND);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(167,139,250,0.3)';
    const tileOff = s.dist % 40;
    for (let x = -tileOff; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND);
      ctx.lineTo(x - 20, PANEL_Y);
      ctx.stroke();
    }

    // Coins
    for (const c of s.coins) {
      const sq = Math.abs(Math.sin(s.time * 5 + c.x * 0.05));
      ctx.save();
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 8 * sq + 2, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (sq > 0.6) glowText(ctx, '1', c.x, c.y + 1, '#713f12', 10, 900);
    }

    // Spikes
    for (const sp of s.spikes) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      const n = Math.round(sp.w / 14);
      for (let k = 0; k < n; k += 1) {
        const x = sp.x + (k * sp.w) / n;
        ctx.beginPath();
        ctx.moveTo(x, GROUND);
        ctx.lineTo(x + sp.w / n / 2, GROUND - 24);
        ctx.lineTo(x + sp.w / n, GROUND);
        ctx.fill();
      }
      ctx.restore();
    }

    // Doors
    for (const d of s.doors) {
      const reveal = !d.hidden || d.x - PLAYER_X < 150 || d.done;
      const color = !reveal ? '#94a3b8' : d.open ? '#4ade80' : '#ef4444';
      const top = 70;
      ctx.save();
      // pylons
      ctx.fillStyle = '#1e1b3a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillRect(d.x - 8, top, 16, GROUND - top);
      ctx.strokeRect(d.x - 8, top, 16, GROUND - top);
      // laser bars (closed) or a soft glow (open)
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      if (reveal && d.open) {
        ctx.fillStyle = 'rgba(74,222,128,0.18)';
        ctx.fillRect(d.x - 4, top + 6, 8, GROUND - top - 6);
      } else if (!d.done || !d.open) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        for (let y = top + 14; y < GROUND; y += 18) {
          ctx.globalAlpha = 0.6 + Math.sin(s.time * 20 + y) * 0.3;
          ctx.beginPath();
          ctx.moveTo(d.x - 26, y);
          ctx.lineTo(d.x + 26, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // label
      ctx.save();
      ctx.font = '900 15px "JetBrains Mono", Consolas, monospace';
      const tw = ctx.measureText(d.expr.label).width + 24;
      ctx.fillStyle = 'rgba(10,6,24,0.92)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillRect(d.x - tw / 2, top - 46, tw, 30);
      ctx.strokeRect(d.x - tw / 2, top - 46, tw, 30);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.expr.label, d.x, top - 30);
      // output lamp
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(d.x, top - 6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#05050a';
      ctx.font = '900 9px Inter, sans-serif';
      ctx.fillText(reveal ? (d.open ? '1' : '0') : '?', d.x, top - 5.5);
      ctx.restore();
    }

    // Robot
    const blink = s.invuln > 0 && Math.floor(s.time * 14) % 2 === 0;
    if (!blink && !(s.dying && s.lives <= 0)) {
      const x = PLAYER_X;
      const y = s.y;
      const run = s.onGround && speed > 0 ? Math.sin(s.time * 22) : 0;
      ctx.save();
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 14;
      // legs
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 9, y + 28);
      ctx.lineTo(x + 9 + run * 7, y + PH);
      ctx.moveTo(x + 17, y + 28);
      ctx.lineTo(x + 17 - run * 7, y + PH);
      ctx.stroke();
      // body
      ctx.fillStyle = '#1e3a5f';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 10, PW - 4, 20, 4);
      ctx.fill();
      ctx.stroke();
      // head + visor
      ctx.beginPath();
      ctx.roundRect(x + 3, y - 4, PW - 6, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(x + 12, y + 0, 10, 4);
      // A/B status lights on the chest
      ctx.shadowBlur = 0;
      ctx.fillStyle = s.a ? '#facc15' : '#334155';
      ctx.fillRect(x + 6, y + 16, 5, 5);
      ctx.fillStyle = s.b ? '#facc15' : '#334155';
      ctx.fillRect(x + 15, y + 16, 5, 5);
      ctx.restore();
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x + PW / 2, GROUND + 3, 14 - (GROUND - PH - y) * 0.05, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    fx.draw(ctx);
    ctx.restore(); // shake

    // Panel
    ctx.fillStyle = 'rgba(8,6,16,0.95)';
    ctx.fillRect(0, PANEL_Y, W, H - PANEL_Y);
    const sw = (key: 'a' | 'b', label: string) => {
      const b = BTN[key];
      const on = s[key];
      const p = s.press[key] > 0 ? 2 : 0;
      ctx.save();
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = on ? 18 : 0;
      ctx.fillStyle = on ? '#a16207' : '#1a1428';
      ctx.strokeStyle = on ? '#fde68a' : 'rgba(167,139,250,0.5)';
      ctx.lineWidth = 2;
      ctx.fillRect(b.x + p, PANEL_Y + 8 + p, b.w - 2 * p, 50 - 2 * p);
      ctx.strokeRect(b.x + p, PANEL_Y + 8 + p, b.w - 2 * p, 50 - 2 * p);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '900 20px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(`${label} = ${on ? 1 : 0}`, b.x + b.w / 2, PANEL_Y + 30);
      ctx.font = '700 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(on ? 'ON · key ' + label : 'OFF · key ' + label, b.x + b.w / 2, PANEL_Y + 49);
      ctx.restore();
    };
    sw('a', 'A');
    sw('b', 'B');
    ctx.save();
    const jp = s.press.j > 0 ? 2 : 0;
    ctx.fillStyle = '#2a1d4a';
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2;
    ctx.fillRect(BTN.j.x + jp, PANEL_Y + 8 + jp, BTN.j.w - 2 * jp, 50 - 2 * jp);
    ctx.strokeRect(BTN.j.x + jp, PANEL_Y + 8 + jp, BTN.j.w - 2 * jp, 50 - 2 * jp);
    ctx.fillStyle = '#fff';
    ctx.font = '900 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JUMP', BTN.j.x + BTN.j.w / 2, PANEL_Y + 28);
    ctx.font = '700 9px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('space · or tap the sky', BTN.j.x + BTN.j.w / 2, PANEL_Y + 47);
    ctx.restore();
    // Next door preview in the panel middle
    const nextDoor = s.doors.find((d) => !d.done);
    if (nextDoor) {
      const reveal = !nextDoor.hidden || nextDoor.x - PLAYER_X < 150;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('NEXT DOOR', 345, PANEL_Y + 16);
      ctx.font = '900 15px "JetBrains Mono", Consolas, monospace';
      ctx.fillStyle = !reveal ? '#cbd5e1' : nextDoor.open ? '#86efac' : '#fca5a5';
      ctx.fillText(`${nextDoor.expr.label} → ${reveal ? (nextDoor.open ? '1' : '0') : '?'}`, 345, PANEL_Y + 38);
      ctx.restore();
    }

    // HUD
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '800 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('SCORE', 14, 12);
    ctx.fillText('DOORS', 128, 12);
    ctx.font = '900 22px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(Math.floor(s.score)), 14, 26);
    ctx.fillText(String(s.passed), 128, 26);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < s.lives ? '#22d3ee' : 'rgba(255,255,255,0.15)';
      ctx.fillRect(200 + i * 20, 30, 14, 14);
    }
    ctx.restore();

    if (s.note.life > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(s.note.life, 0, 1);
      ctx.font = '700 13px Inter, sans-serif';
      const tw = Math.min(W - 20, ctx.measureText(s.note.text).width + 24);
      ctx.fillStyle = 'rgba(80,12,30,0.92)';
      ctx.fillRect(W / 2 - tw / 2, PANEL_Y - 40, tw, 30);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.note.text, W / 2, PANEL_Y - 25, W - 32);
      ctx.restore();
    }
    if (s.banner.life > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(s.banner.life, 0, 1);
      glowText(ctx, s.banner.text, W / 2, 140, '#fde68a', 40, 900);
      ctx.font = '700 14px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(s.banner.sub, W / 2, 176);
      ctx.restore();
    }
    fx.drawFlash(ctx, W, H);
  });

  return (
    <Stage aspect={W / H} maxWidth={760}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" onPointerDown={onPointer} />
      <ReadyOverlay count={ready} title="Gate Runner" hint="A and B flip the switches · Space jumps" />
    </Stage>
  );
};

const GateRunner: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [result, setResult] = useState<GateResult | null>(null);

  if (phase === 'play') {
    return <GateRun onEnd={(r) => { setResult(r); setPhase('over'); onFinish(r.score); }} />;
  }
  if (phase === 'over' && result) {
    return (
      <OverScreen
        score={result.score}
        best={best}
        lines={[
          `Doors opened: ${result.doors}`,
          `Crashes: ${result.crashes}`,
          `Bits collected: ${result.coins}`,
          `Distance: ${result.distance} m`,
        ]}
        lesson="Logic gates take inputs that are 1 or 0 and give one output. AND needs both, OR needs at least one, NOT flips, XOR needs exactly one. A computer chip is billions of these tiny gates wired together, and every decision a program makes comes down to them."
        onAgain={() => { sfx.unlock(); setPhase('play'); }}
      />
    );
  }
  return (
    <StartScreen
      concept="Logic gates"
      howTo={[
        'Your robot runs on its own. Laser doors block the road, and each is wired to a logic gate like A AND B or NOT A.',
        'Flip your two switches, A and B, with the A and B keys (or tap them). When the gate outputs 1 the door turns green and opens. Red means 0: you will crash.',
        'Jump the red spikes with Space (or tap the sky) and grab the gold bits.',
        'Later doors use XOR, NAND and NOR, and some hide their light until the last moment, so you have to work it out.',
      ]}
      onStart={() => { sfx.unlock(); setPhase('play'); }}
    />
  );
};

export default GateRunner;
