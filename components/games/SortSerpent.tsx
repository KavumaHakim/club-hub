import React, { useEffect, useRef, useState } from 'react';
import { GameProps, OverScreen, StartScreen, shuffle } from './gameKit';
import { Fx, ReadyOverlay, Stage, clamp, glowText, sfx, useGameLoop, useLogicalCanvas, useReady } from './arcadeKit';

// Sort Serpent: a neon snake that must eat the numbers in order — smallest
// first (later, biggest first). Finding the smallest that's left, again and
// again, is exactly how selection sort works.

const COLS = 20;
const ROWS = 22;
const CELL = 24;
const TOP = 72;
const W = COLS * CELL;
const H = TOP + ROWS * CELL;

type Dir = { x: number; y: number };
type Cell = { x: number; y: number };
interface Pellet extends Cell { n: number; born: number }

export interface SerpentResult { score: number; level: number; eaten: number; wrong: number; longest: number }

const levelSpec = (level: number) => {
  const count = Math.min(8, 3 + level);
  const max = level <= 1 ? 20 : level <= 3 ? 50 : 99;
  const order: 'asc' | 'desc' = level % 3 === 0 ? 'desc' : 'asc';
  const tick = Math.max(0.075, 0.15 - (level - 1) * 0.012);
  return { count, max, order, tick };
};

const newState = () => ({
  snake: [{ x: 6, y: 11 }, { x: 5, y: 11 }, { x: 4, y: 11 }] as Cell[],
  dir: { x: 1, y: 0 } as Dir,
  queue: [] as Dir[],
  grow: 0,
  pellets: [] as Pellet[],
  level: 1,
  lives: 3,
  score: 0,
  eaten: 0,
  wrong: 0,
  longest: 3,
  streak: 0,
  acc: 0,
  time: 0,
  dying: 0,
  ended: false,
  invuln: 0,
  waiting: true, // the serpent sits still until you choose a direction
  banner: { text: 'LEVEL 1', sub: 'Eat the numbers from SMALLEST to biggest', life: 2.6 },
  note: { text: '', life: 0 },
});
type State = ReturnType<typeof newState>;

const target = (s: State) => {
  if (!s.pellets.length) return null;
  const { order } = levelSpec(s.level);
  return s.pellets.reduce((best, p) => (order === 'asc' ? (p.n < best.n ? p : best) : (p.n > best.n ? p : best)));
};

const SerpentRun: React.FC<{ onEnd: (r: SerpentResult) => void }> = ({ onEnd }) => {
  const { ref } = useLogicalCanvas(W, H);
  const s = useRef(newState()).current;
  const fx = useRef(new Fx()).current;
  const ready = useReady(3);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  const px = (c: Cell) => ({ x: c.x * CELL + CELL / 2, y: TOP + c.y * CELL + CELL / 2 });

  const freeCell = (): Cell => {
    for (let tries = 0; tries < 400; tries += 1) {
      const c = { x: 1 + Math.floor(Math.random() * (COLS - 2)), y: 1 + Math.floor(Math.random() * (ROWS - 2)) };
      const head = s.snake[0];
      if (Math.abs(c.x - head.x) + Math.abs(c.y - head.y) < 4) continue;
      if (s.snake.some((b) => b.x === c.x && b.y === c.y)) continue;
      if (s.pellets.some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 2)) continue;
      return c;
    }
    return { x: 1, y: 1 };
  };

  const fillBoard = () => {
    const { count, max } = levelSpec(s.level);
    const nums = shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, count);
    s.pellets = [];
    for (const n of nums) s.pellets.push({ ...freeCell(), n, born: s.time });
  };
  if (!s.pellets.length && !s.ended && s.time === 0) fillBoard();

  const steer = (d: Dir) => {
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (last.x === -d.x && last.y === -d.y) return; // no reversing into yourself
    if (s.waiting) {
      s.waiting = false;
      s.dir = d;
      s.queue = [];
      return;
    }
    if (last.x === d.x && last.y === d.y) return;
    if (s.queue.length < 3) s.queue.push(d);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      sfx.unlock();
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') steer({ x: 0, y: -1 });
      else if (k === 'arrowdown' || k === 's') steer({ x: 0, y: 1 });
      else if (k === 'arrowleft' || k === 'a') steer({ x: -1, y: 0 });
      else if (k === 'arrowright' || k === 'd') steer({ x: 1, y: 0 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Swipe anywhere on the board
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { sfx.unlock(); swipe.current = { x: e.clientX, y: e.clientY }; };
  const onMove = (e: React.PointerEvent) => {
    const st = swipe.current;
    if (!st) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    steer(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { swipe.current = null; };

  const loseLife = (why: string) => {
    s.lives -= 1;
    s.streak = 0;
    fx.shake(12, 0.3);
    fx.hit();
    sfx.hurt();
    s.note = { text: why, life: 3 };
    if (s.lives <= 0) {
      s.dying = 1.6;
      for (const b of s.snake) {
        const p = px(b);
        fx.burst(p.x, p.y, '#4ade80', 6, 200, 4);
      }
      sfx.boom();
      sfx.gameOver();
    }
  };

  const step = () => {
    if (s.queue.length) s.dir = s.queue.shift()!;
    const head = s.snake[0];
    const next = { x: head.x + s.dir.x, y: head.y + s.dir.y };
    const hitWall = next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS;
    const hitSelf = s.snake.slice(0, -1).some((b) => b.x === next.x && b.y === next.y);
    if ((hitWall || hitSelf) && s.invuln <= 0) {
      const p = px(head);
      fx.burst(p.x, p.y, '#fb7185', 30, 260, 4);
      loseLife(hitWall ? 'Ouch, the wall! Turn sooner.' : 'You bit your own tail!');
      if (s.lives > 0) {
        // Respawn in the middle, keeping your length.
        const len = s.snake.length;
        s.snake = Array.from({ length: len }, (_, i) => ({ x: clamp(10 - i, 0, COLS - 1), y: 11 }));
        s.dir = { x: 1, y: 0 };
        s.queue = [];
        s.invuln = 1.5;
        s.waiting = true;
      }
      return;
    }
    if (hitWall) return; // invulnerable: just wait for a turn
    s.snake.unshift(next);
    const pellet = s.pellets.find((p) => p.x === next.x && p.y === next.y);
    if (pellet) {
      const want = target(s)!;
      const p = px(pellet);
      s.pellets = s.pellets.filter((q) => q !== pellet);
      if (pellet === want) {
        s.streak += 1;
        s.eaten += 1;
        s.grow += 2;
        const pts = 10 * s.level + s.streak * 2;
        s.score += pts;
        fx.burst(p.x, p.y, '#facc15', 24, 240, 4);
        fx.float(p.x, p.y - 16, `+${pts}`, '#fde68a', 16);
        sfx.tone(440 + Math.min(12, s.streak) * 60, 0.09, { type: 'triangle', vol: 0.2 });
      } else {
        s.wrong += 1;
        fx.burst(p.x, p.y, '#fb7185', 24, 240, 4);
        const { order } = levelSpec(s.level);
        loseLife(`${want.n} was ${order === 'asc' ? 'smaller' : 'bigger'} than ${pellet.n}. Find the ${order === 'asc' ? 'smallest' : 'biggest'} first!`);
      }
      if (!s.pellets.length && s.lives > 0) {
        s.level += 1;
        s.score += 50 * (s.level - 1);
        const spec = levelSpec(s.level);
        s.banner = {
          text: `LEVEL ${s.level}`,
          sub: spec.order === 'desc' ? 'Reverse! Now BIGGEST first' : `Smallest first · ${spec.count} numbers up to ${spec.max}`,
          life: 2.6,
        };
        sfx.levelUp();
        fillBoard();
      }
    }
    if (s.grow > 0) s.grow -= 1;
    else s.snake.pop();
    s.longest = Math.max(s.longest, s.snake.length);
  };

  useGameLoop(true, (dt) => {
    s.time += dt;
    fx.update(dt);
    if (ready <= 0) s.banner.life -= dt;
    s.note.life -= dt;
    s.invuln = Math.max(0, s.invuln - dt);

    if (s.dying && !s.ended) {
      s.dying -= dt;
      if (s.dying <= 0) {
        s.ended = true;
        endRef.current({ score: s.score, level: s.level, eaten: s.eaten, wrong: s.wrong, longest: s.longest });
      }
    } else if (ready <= 0 && !s.ended) {
      s.acc += dt;
      const { tick } = levelSpec(s.level);
      if (s.waiting) s.acc = 0;
      while (s.acc >= tick && !s.dying) {
        s.acc -= tick;
        step();
      }
    }

    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#07060f';
    ctx.fillRect(0, 0, W, H);
    fx.applyShake(ctx);

    // Board
    const board = ctx.createLinearGradient(0, TOP, 0, H);
    board.addColorStop(0, '#0c0a1d');
    board.addColorStop(1, '#130d26');
    ctx.fillStyle = board;
    ctx.fillRect(0, TOP, W, ROWS * CELL);
    ctx.fillStyle = 'rgba(167,139,250,0.16)';
    for (let x = 0; x < COLS; x += 1) for (let y = 0; y < ROWS; y += 1) ctx.fillRect(x * CELL + CELL / 2 - 1, TOP + y * CELL + CELL / 2 - 1, 2, 2);
    ctx.save();
    ctx.strokeStyle = '#a78bfa';
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, TOP + 1, W - 2, ROWS * CELL - 2);
    ctx.restore();

    // Pellets
    // The next number is never highlighted: finding it is the game.
    for (const p of s.pellets) {
      const c = px(p);
      const pop = clamp((s.time - p.born) * 4, 0, 1);
      const r = (CELL * 0.62 + Math.sin(s.time * 4 + p.n) * 1.2) * pop;
      ctx.save();
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#0e2a3a';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (pop > 0.5) glowText(ctx, String(p.n), c.x, c.y + 1, '#fff', p.n > 9 ? 13 : 15);
    }

    // Snake
    const blink = s.invuln > 0 && Math.floor(s.time * 12) % 2 === 0;
    if (!blink && !(s.dying && s.lives <= 0)) {
      ctx.save();
      for (let i = s.snake.length - 1; i >= 0; i -= 1) {
        const b = px(s.snake[i]);
        const t = i / Math.max(1, s.snake.length - 1);
        const hue = 150 - t * 70; // green head fading to teal/blue tail
        ctx.fillStyle = `hsl(${hue}, 85%, ${60 - t * 18}%)`;
        ctx.shadowColor = `hsl(${hue}, 90%, 55%)`;
        ctx.shadowBlur = i === 0 ? 20 : 8;
        const size = CELL - 4 - t * 4;
        ctx.beginPath();
        ctx.roundRect(b.x - size / 2, b.y - size / 2, size, size, 6);
        ctx.fill();
      }
      // Eyes
      const h = px(s.snake[0]);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#05160c';
      const ex = s.dir.y !== 0 ? 5 : 0;
      const ey = s.dir.x !== 0 ? 5 : 0;
      ctx.beginPath();
      ctx.arc(h.x + s.dir.x * 4 + ex, h.y + s.dir.y * 4 + ey, 2.6, 0, Math.PI * 2);
      ctx.arc(h.x + s.dir.x * 4 - ex, h.y + s.dir.y * 4 - ey, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    fx.draw(ctx);
    ctx.restore(); // shake

    // HUD
    const spec = levelSpec(s.level);
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '800 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('SCORE', 14, 12);
    ctx.fillText('LEVEL', 118, 12);
    ctx.fillText('LIVES', 186, 12);
    ctx.font = '900 24px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(s.score), 14, 26);
    ctx.fillText(String(s.level), 118, 26);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < s.lives ? '#4ade80' : 'rgba(255,255,255,0.15)';
      ctx.fillRect(186 + i * 20, 32, 14, 14);
    }
    ctx.restore();
    // Kept left of centre: the mute / fullscreen buttons sit top-right.
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '800 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('EAT NEXT', 262, 12);
    ctx.restore();
    glowText(ctx, spec.order === 'asc' ? 'SMALLEST ↑' : 'BIGGEST ↓', 306, 38, spec.order === 'asc' ? '#67e8f9' : '#f9a8d4', 16, 900);
    if (s.waiting && ready <= 0 && !s.dying && s.banner.life <= 0.5) {
      const head = px(s.snake[0]);
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(s.time * 6) * 0.4;
      glowText(ctx, 'Press an arrow or swipe to go', W / 2, head.y - 40, '#fff', 15, 800);
      ctx.restore();
    }

    if (s.note.life > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(s.note.life, 0, 1);
      ctx.font = '700 13px Inter, sans-serif';
      const tw = Math.min(W - 20, ctx.measureText(s.note.text).width + 24);
      ctx.fillStyle = 'rgba(80,12,30,0.92)';
      ctx.fillRect(W / 2 - tw / 2, H - 44, tw, 30);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.note.text, W / 2, H - 29, W - 32);
      ctx.restore();
    }
    if (s.banner.life > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(s.banner.life, 0, 1);
      glowText(ctx, s.banner.text, W / 2, TOP + 150, '#86efac', 40, 900);
      ctx.font = '700 14px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(s.banner.sub, W / 2, TOP + 186);
      ctx.restore();
    }
    fx.drawFlash(ctx, W, H);
  });

  return (
    <Stage aspect={W / H} maxWidth={520}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      <ReadyOverlay count={ready} title="Sort Serpent" hint="Arrow keys / WASD or swipe. Eat the smallest number first." />
    </Stage>
  );
};

const SortSerpent: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [result, setResult] = useState<SerpentResult | null>(null);

  if (phase === 'play') {
    return <SerpentRun onEnd={(r) => { setResult(r); setPhase('over'); onFinish(r.score); }} />;
  }
  if (phase === 'over' && result) {
    return (
      <OverScreen
        score={result.score}
        best={best}
        lines={[
          `Reached level ${result.level}`,
          `Numbers eaten in order: ${result.eaten}`,
          `Out-of-order bites: ${result.wrong}`,
          `Longest serpent: ${result.longest}`,
        ]}
        lesson="To put a list in order you can keep finding the smallest thing that's left and taking it out. That's selection sort, and it's exactly what you did with every bite. Computers sort millions of things this way (and with cleverer, faster methods)."
        onAgain={() => { sfx.unlock(); setPhase('play'); }}
      />
    );
  }
  return (
    <StartScreen
      concept="Sorting and ordering"
      howTo={[
        'Steer the serpent with the arrow keys or WASD. On a phone, swipe.',
        'Numbers appear on the board. Eat them in order, smallest first. Biting the wrong one costs a life.',
        'Every number you eat makes you longer, so watch out for walls and your own tail.',
        'Clear the board to level up. Every third level flips the order: biggest first!',
      ]}
      onStart={() => { sfx.unlock(); setPhase('play'); }}
    />
  );
};

export default SortSerpent;
