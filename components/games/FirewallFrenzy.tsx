import React, { useRef, useState } from 'react';
import { GameProps, OverScreen, StartScreen, pickOne } from './gameKit';
import { Fx, ReadyOverlay, Stage, clamp, glowText, rand, sfx, useGameLoop, useLogicalCanvas, useReady } from './arcadeKit';

// Firewall Frenzy: files and links stream towards the school server. Tap the
// dangerous ones to zap them before they get in; let the safe ones through.
// Level 1 is risky file types, level 2 adds fake double extensions, level 3
// adds lookalike (phishing) links.

const W = 480;
const H = 680;
const CORE = { x: W / 2, y: 330 };
const CORE_R = 46;
const PER_LEVEL = 12;

const SAFE_EXT = ['pdf', 'jpg', 'png', 'docx', 'mp3', 'txt', 'pptx', 'xlsx'];
const BAD_EXT = ['exe', 'bat', 'scr', 'vbs'];
const SAFE_NAMES = ['notes', 'photo', 'homework', 'song', 'timetable', 'report', 'poster', 'results', 'selfie', 'essay', 'budget', 'map'];
const BAD_NAMES = ['free_airtime', 'game_hack', 'win_prize', 'crack', 'update', 'unlock_data', 'notes', 'photo', 'homework', 'results'];
const SAFE_LINKS = ['google.com', 'wikipedia.org', 'mtn.co.ug', 'makerere.ac.ug', 'github.com', 'youtube.com', 'airtel.co.ug', 'bbc.com'];
const BAD_LINKS = ['g00gle.com', 'wikipedla.org', 'mtn-bonus.win', 'rnakerere.ac.ug', 'githlub.com', 'youtube.free-gift.xyz', 'airtel-prize.top', 'bbc.com.login-now.ru'];

interface Item { text: string; bad: boolean; kind: 'file' | 'link'; why: string }

const makeItem = (level: number): Item => {
  const bad = Math.random() < 0.5;
  const roll = Math.random();
  if (level >= 3 && roll < 0.45) {
    return bad
      ? { text: pickOne(BAD_LINKS), bad, kind: 'link', why: 'Lookalike link: a letter swapped or a fake ending' }
      : { text: pickOne(SAFE_LINKS), bad, kind: 'link', why: 'That is the real site' };
  }
  if (level >= 2 && bad && roll < 0.75) {
    return { text: `${pickOne(SAFE_NAMES)}.${pickOne(SAFE_EXT)}.${pickOne(BAD_EXT)}`, bad, kind: 'file', why: 'Only the LAST extension counts: it is a program' };
  }
  return bad
    ? { text: `${pickOne(BAD_NAMES)}.${pickOne(BAD_EXT)}`, bad, kind: 'file', why: '.exe .bat .scr .vbs files run code' }
    : { text: `${pickOne(SAFE_NAMES)}.${pickOne(SAFE_EXT)}`, bad, kind: 'file', why: 'Documents, pictures and music are safe to open' };
};

const RULES = [
  ['Block programs:', '.exe  .bat  .scr  .vbs'],
  ['Block fake double extensions:', 'photo.jpg.exe'],
  ['Block lookalike links:', 'g00gle.com  mtn-bonus.win'],
];

interface Packet { id: number; item: Item; x: number; y: number; vx: number; vy: number; w: number; age: number }
interface Bolt { x: number; y: number; life: number }

export interface FirewallResult { score: number; blocked: number; delivered: number; leaks: number; falseAlarms: number; level: number }

const RunFirewall: React.FC<{ onEnd: (r: FirewallResult) => void }> = ({ onEnd }) => {
  const { ref, toLogical } = useLogicalCanvas(W, H);
  const fx = useRef(new Fx()).current;
  const ready = useReady(3);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const measureRef = useRef<CanvasRenderingContext2D | null>(null);

  const s = useRef({
    packets: [] as Packet[],
    bolts: [] as Bolt[],
    nextId: 1,
    spawnIn: 0.5,
    handled: 0,
    level: 1,
    integrity: 3,
    score: 0,
    combo: 0,
    blocked: 0,
    delivered: 0,
    leaks: 0,
    falseAlarms: 0,
    time: 0,
    dying: 0,
    ended: false,
    banner: { text: 'LEVEL 1', sub: 'Zap programs before they reach the server', life: 2.6 },
    lastWhy: { text: '', life: 0, bad: true },
    pulses: Array.from({ length: 10 }, () => ({ a: Math.random() * Math.PI * 2, r: rand(60, 380), sp: rand(60, 140) })),
  }).current;

  const textWidth = (text: string) => {
    if (!measureRef.current) measureRef.current = document.createElement('canvas').getContext('2d');
    const m = measureRef.current!;
    m.font = '800 14px "JetBrains Mono", Consolas, monospace';
    return m.measureText(text).width + 40;
  };

  const spawn = () => {
    const item = makeItem(s.level);
    const w = textWidth(item.text);
    // Start on a ring outside the screen and fly straight at the core.
    // Pick the direction furthest from packets already flying, so labels don't stack.
    const taken = s.packets.map((p) => Math.atan2(p.y - CORE.y, p.x - CORE.x));
    const gap = (a: number) => taken.reduce((m, t) => Math.min(m, Math.abs(Math.atan2(Math.sin(a - t), Math.cos(a - t)))), Math.PI);
    let a = rand(0, Math.PI * 2);
    for (let k = 0; k < 8; k += 1) {
      const c = rand(0, Math.PI * 2);
      if (gap(c) > gap(a)) a = c;
    }
    let x = CORE.x + Math.cos(a) * 420;
    let y = CORE.y + Math.sin(a) * 420;
    x = clamp(x, w / 2 + 6, W - w / 2 - 6);
    y = clamp(y, 78, H - 70);
    if (Math.abs(x - CORE.x) < 150 && Math.abs(y - CORE.y) < 150) y = y < CORE.y ? 78 : H - 70;
    const dx = CORE.x - x;
    const dy = CORE.y - y;
    const len = Math.hypot(dx, dy);
    const speed = (26 + s.level * 7 + s.handled * 0.45) * rand(0.85, 1.15);
    s.packets.push({ id: s.nextId++, item, x, y, vx: (dx / len) * speed, vy: (dy / len) * speed, w, age: 0 });
  };

  const handled = () => {
    s.handled += 1;
    const lvl = Math.min(3, 1 + Math.floor(s.handled / PER_LEVEL));
    if (lvl > s.level) {
      s.level = lvl;
      s.banner = lvl === 2
        ? { text: 'LEVEL 2', sub: 'Watch for double extensions: only the last one counts', life: 3 }
        : { text: 'LEVEL 3', sub: 'Links now too. Spot the lookalikes', life: 3 };
      sfx.levelUp();
    }
  };

  const loseIntegrity = () => {
    s.integrity -= 1;
    s.combo = 0;
    fx.shake(14, 0.35);
    fx.hit();
    sfx.hurt();
    if (s.integrity <= 0) {
      s.dying = 1.8;
      fx.burst(CORE.x, CORE.y, '#fb7185', 90, 420, 5);
      fx.burst(CORE.x, CORE.y, '#facc15', 40, 300, 4);
      fx.shake(22, 0.6);
      sfx.boom();
      sfx.gameOver();
    }
  };

  const zap = (p: Packet) => {
    s.packets = s.packets.filter((q) => q !== p);
    s.bolts.push({ x: p.x, y: p.y, life: 0.2 });
    sfx.laser();
    if (p.item.bad) {
      s.combo += 1;
      s.blocked += 1;
      const mult = Math.min(4, 1 + Math.floor((s.combo - 1) / 4));
      const pts = 20 * s.level * mult;
      s.score += pts;
      fx.burst(p.x, p.y, '#4ade80', 28, 260, 4);
      fx.float(p.x, p.y - 18, `BLOCKED +${pts}${mult > 1 ? ` x${mult}` : ''}`, '#86efac', 16);
      sfx.noise(0.2, 0.2);
    } else {
      s.falseAlarms += 1;
      fx.burst(p.x, p.y, '#fb7185', 20, 200, 3);
      fx.float(p.x, p.y - 18, 'FALSE ALARM', '#fda4af', 16);
      s.lastWhy = { text: `${p.item.text} was safe. ${p.item.why}.`, life: 3, bad: true };
      loseIntegrity();
    }
    handled();
  };

  const onPointer = (e: React.PointerEvent) => {
    sfx.unlock();
    if (ready > 0 || s.dying) return;
    const { x, y } = toLogical(e.clientX, e.clientY);
    // Generous hit boxes for fingers; newest-drawn (top) first.
    for (let i = s.packets.length - 1; i >= 0; i -= 1) {
      const p = s.packets[i];
      if (Math.abs(x - p.x) <= p.w / 2 + 8 && Math.abs(y - p.y) <= 24) {
        zap(p);
        return;
      }
    }
  };

  useGameLoop(true, (dt) => {
    s.time += dt;
    fx.update(dt);
    if (ready <= 0) s.banner.life -= dt;
    s.lastWhy.life -= dt;
    for (const b of s.bolts) b.life -= dt;
    s.bolts = s.bolts.filter((b) => b.life > 0);
    for (const p of s.pulses) {
      p.r -= p.sp * dt;
      if (p.r < CORE_R) { p.r = rand(300, 420); p.a = Math.random() * Math.PI * 2; }
    }

    if (s.dying && !s.ended) {
      s.dying -= dt;
      if (s.dying <= 0) {
        s.ended = true;
        endRef.current({ score: s.score, blocked: s.blocked, delivered: s.delivered, leaks: s.leaks, falseAlarms: s.falseAlarms, level: s.level });
      }
    }

    if (ready <= 0 && !s.dying) {
      s.spawnIn -= dt;
      const maxOn = Math.min(7, 2 + s.level + Math.floor(s.handled / 10));
      if (s.spawnIn <= 0 && s.packets.length < maxOn) {
        spawn();
        s.spawnIn = Math.max(0.7, 2.2 - s.level * 0.25 - s.handled * 0.015) * rand(0.75, 1.25);
      }
      for (const p of s.packets) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.age += dt;
      }
      const arrived = s.packets.filter((p) => Math.hypot(p.x - CORE.x, p.y - CORE.y) < CORE_R + 14);
      if (arrived.length) {
        s.packets = s.packets.filter((p) => !arrived.includes(p));
        for (const p of arrived) {
          if (p.item.bad) {
            s.leaks += 1;
            fx.burst(p.x, p.y, '#fb7185', 34, 300, 4);
            fx.float(CORE.x, CORE.y - 70, 'MALWARE GOT IN!', '#fda4af', 18);
            s.lastWhy = { text: `${p.item.text} was dangerous. ${p.item.why}.`, life: 3.2, bad: true };
            loseIntegrity();
          } else {
            s.delivered += 1;
            const pts = 10 * s.level;
            s.score += pts;
            fx.burst(CORE.x, CORE.y, '#67e8f9', 12, 140, 3);
            fx.float(CORE.x + rand(-30, 30), CORE.y - 64, `+${pts}`, '#a5f3fc', 15);
            sfx.coin();
          }
          handled();
        }
      }
    }

    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;

    // Background: dark board with circuit traces flowing into the core
    const bg = ctx.createRadialGradient(CORE.x, CORE.y, 20, CORE.x, CORE.y, 520);
    bg.addColorStop(0, '#1a1036');
    bg.addColorStop(1, '#06050d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    fx.applyShake(ctx);
    ctx.save();
    ctx.strokeStyle = 'rgba(167,139,250,0.12)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 16; k += 1) {
      const a = (k / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(CORE.x + Math.cos(a) * CORE_R, CORE.y + Math.sin(a) * CORE_R);
      const mx = CORE.x + Math.cos(a) * 150;
      const my = CORE.y + Math.sin(a) * 150;
      ctx.lineTo(mx, my);
      ctx.lineTo(mx + Math.cos(a + 0.5) * 300, my + Math.sin(a + 0.5) * 300);
      ctx.stroke();
    }
    for (const p of s.pulses) {
      ctx.fillStyle = 'rgba(103,232,249,0.5)';
      ctx.beginPath();
      ctx.arc(CORE.x + Math.cos(p.a) * p.r, CORE.y + Math.sin(p.a) * p.r, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Firewall ring
    ctx.save();
    ctx.translate(CORE.x, CORE.y);
    ctx.rotate(s.time * 0.4);
    ctx.strokeStyle = 'rgba(34,211,238,0.35)';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Core (the school server) with integrity segments
    if (!(s.dying && s.integrity <= 0)) {
      ctx.save();
      ctx.translate(CORE.x, CORE.y);
      const hurt = s.integrity <= 1;
      ctx.shadowColor = hurt ? '#fb7185' : '#a78bfa';
      ctx.shadowBlur = 30 + Math.sin(s.time * 4) * 8;
      ctx.fillStyle = '#1b1240';
      ctx.strokeStyle = hurt ? '#fb7185' : '#c4b5fd';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < 6; k += 1) {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        ctx.lineTo(Math.cos(a) * CORE_R, Math.sin(a) * CORE_R);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let k = 0; k < 3; k += 1) {
        ctx.strokeStyle = k < s.integrity ? '#22d3ee' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        const a0 = -Math.PI / 2 + (k * Math.PI * 2) / 3 + 0.12 + s.time * 0.8;
        ctx.arc(0, 0, CORE_R + 14, a0, a0 + (Math.PI * 2) / 3 - 0.24);
        ctx.stroke();
      }
      // server rack lines
      ctx.fillStyle = 'rgba(196,181,253,0.8)';
      for (let k = -1; k <= 1; k += 1) {
        ctx.fillRect(-20, k * 12 - 3, 40, 5);
        ctx.fillStyle = Math.floor(s.time * 5 + k) % 2 ? '#4ade80' : '#166534';
        ctx.fillRect(14, k * 12 - 2, 4, 3);
        ctx.fillStyle = 'rgba(196,181,253,0.8)';
      }
      ctx.restore();
    }

    // Zap bolts
    for (const b of s.bolts) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = b.life / 0.2;
      ctx.strokeStyle = '#a5f3fc';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CORE.x, CORE.y);
      const steps = 7;
      for (let k = 1; k <= steps; k += 1) {
        const t = k / steps;
        const jitter = k === steps ? 0 : rand(-14, 14);
        ctx.lineTo(CORE.x + (b.x - CORE.x) * t + jitter, CORE.y + (b.y - CORE.y) * t + jitter);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Packets
    for (const p of s.packets) {
      const near = clamp(1 - (Math.hypot(p.x - CORE.x, p.y - CORE.y) - 100) / 160, 0, 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      const pop = Math.min(1, p.age * 5);
      ctx.scale(pop, pop);
      // trail
      ctx.strokeStyle = 'rgba(167,139,250,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-p.vx * 0.5, -p.vy * 0.5);
      ctx.stroke();
      ctx.shadowColor = near > 0.5 && Math.floor(s.time * 8) % 2 ? '#fb7185' : '#a78bfa';
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(24,16,48,0.95)';
      ctx.strokeStyle = near > 0.5 ? '#fda4af' : 'rgba(196,181,253,0.85)';
      ctx.lineWidth = 2;
      const h = 34;
      ctx.beginPath();
      ctx.roundRect(-p.w / 2, -h / 2, p.w, h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      // icon
      const ix = -p.w / 2 + 16;
      if (p.item.kind === 'file') {
        ctx.fillStyle = '#e9d5ff';
        ctx.beginPath();
        ctx.moveTo(ix - 5, -8);
        ctx.lineTo(ix + 2, -8);
        ctx.lineTo(ix + 6, -4);
        ctx.lineTo(ix + 6, 8);
        ctx.lineTo(ix - 5, 8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = '#a5f3fc';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(ix - 3, 0, 5, 3.4, -0.6, 0, Math.PI * 2);
        ctx.ellipse(ix + 4, -3, 5, 3.4, -0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.font = '800 14px "JetBrains Mono", Consolas, monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(p.item.text, ix + 12, 1);
      ctx.restore();
    }

    fx.draw(ctx);
    ctx.restore(); // shake

    // HUD
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '800 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('SCORE', 16, 14);
    ctx.fillText('LEVEL', 150, 14);
    ctx.font = '900 24px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(s.score), 16, 28);
    ctx.fillText(String(s.level), 150, 28);
    if (s.combo >= 2) {
      ctx.font = '900 14px Inter, sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.fillText(`STREAK ${s.combo}`, 16, 58);
    }
    ctx.restore();

    // Rules card (what to block at this level)
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,16,0.82)';
    ctx.fillRect(0, H - 22 - s.level * 20, W, 22 + s.level * 20);
    ctx.textBaseline = 'middle';
    for (let k = 0; k < s.level; k += 1) {
      const y = H - 12 - (s.level - k) * 20 + 10;
      ctx.font = '700 12px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.textAlign = 'left';
      ctx.fillText(RULES[k][0], 14, y);
      ctx.font = '800 12px "JetBrains Mono", Consolas, monospace';
      ctx.fillStyle = '#fda4af';
      ctx.textAlign = 'right';
      ctx.fillText(RULES[k][1], W - 14, y);
    }
    ctx.restore();

    if (s.lastWhy.life > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(s.lastWhy.life, 0, 1);
      ctx.font = '700 13px Inter, sans-serif';
      const tw = Math.min(W - 24, ctx.measureText(s.lastWhy.text).width + 24);
      ctx.fillStyle = 'rgba(80,12,30,0.9)';
      ctx.fillRect(W / 2 - tw / 2, H - 66 - s.level * 20, tw, 30);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.lastWhy.text, W / 2, H - 51 - s.level * 20, W - 36);
      ctx.restore();
    }

    if (s.banner.life > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(s.banner.life, 0, 1);
      glowText(ctx, s.banner.text, W / 2, 150, '#c4b5fd', 40, 900);
      ctx.font = '700 14px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      ctx.fillText(s.banner.sub, W / 2, 186);
      ctx.restore();
    }
    fx.drawFlash(ctx, W, H);
  });

  return (
    <Stage aspect={W / H} maxWidth={500}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full cursor-crosshair" onPointerDown={onPointer} />
      <ReadyOverlay count={ready} title="Firewall Frenzy" hint="Tap dangerous files and links. Let safe ones reach the server." />
    </Stage>
  );
};

const FirewallFrenzy: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [result, setResult] = useState<FirewallResult | null>(null);

  if (phase === 'play') {
    return (
      <RunFirewall
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
          `Threats blocked: ${result.blocked}`,
          `Safe files delivered: ${result.delivered}`,
          `Malware that got in: ${result.leaks}`,
          `False alarms: ${result.falseAlarms}`,
          `Reached level ${result.level}`,
        ]}
        lesson="Malware hides in programs (.exe, .bat, .scr, .vbs), often behind a fake second extension like photo.jpg.exe. Phishing links copy real sites with one letter changed or extra words added. Check the very end of a filename and every letter of a link before you open it."
        onAgain={() => { sfx.unlock(); setPhase('play'); }}
      />
    );
  }

  return (
    <StartScreen
      concept="Cyber safety"
      howTo={[
        'Files and links are flying at the school server. You are the firewall.',
        'Tap (or click) the dangerous ones to zap them before they reach the server. Programs like .exe, .bat, .scr and .vbs can run harmful code.',
        'Let the safe ones through: documents, pictures and music. Zapping a safe file is a false alarm and costs a shield, just like letting malware in.',
        'Later come fake double extensions (photo.jpg.exe) and lookalike links (g00gle.com). The rules so far stay at the bottom of the screen.',
      ]}
      onStart={() => { sfx.unlock(); setPhase('play'); }}
    />
  );
};

export default FirewallFrenzy;
