import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameProps, OverScreen, StartScreen, pickOne, randInt, shuffle } from './gameKit';
import { ReadyOverlay, Stage, clamp, rand, sfx, useGameLoop, useReady } from './arcadeKit';

// Packet Runner: you are a data packet racing through the network in 3D.
// At each router, steer into the lane whose route matches your address.
// Later routers have overlapping routes: the most specific one wins, and
// if nothing matches you take the default route. Dodge firewalls, grab bits.

const LANES = [-2.4, 0, 2.4];
const SPAWN_Z = -160;
const GATE_GAP = 150;
const ASPECT = 0.85;

/* ---------- routes ---------- */

interface Route { labels: string[]; correct: number; address: string; why: string }

const finishAddress = (parts: number[]) => {
  const out = [...parts];
  while (out.length < 4) out.push(randInt(1, 254));
  return out.join('.');
};

const distinct = (count: number, min: number, max: number) => {
  const set = new Set<number>();
  while (set.size < count) set.add(randInt(min, max));
  return [...set];
};

const makeRoute = (routed: number): Route => {
  const finalise = (labels: string[], correctLabel: string, address: string, why: string): Route => {
    const order = shuffle(labels);
    return { labels: order, correct: order.indexOf(correctLabel), address, why };
  };

  if (routed < 4) {
    // Level 1: three different networks.
    const nets = shuffle([[10], [172, 16], [192, 168], [100, 64]]).slice(0, 3);
    const pick = pickOne(nets);
    const label = `${pick.join('.')}.*`;
    return finalise(nets.map((n) => `${n.join('.')}.*`), label, finishAddress(pick), `It starts with ${pick.join('.')}`);
  }
  if (routed < 9) {
    // Level 2: same first number, look further along.
    const a = pickOne([10, 172, 192]);
    const bs = distinct(3, 1, 40);
    const b = pickOne(bs);
    return finalise(bs.map((x) => `${a}.${x}.*`), `${a}.${b}.*`, finishAddress([a, b]), `The second number is ${b}`);
  }
  // Level 3: overlapping routes. Longest match wins; default if none.
  const a = pickOne([10, 172, 192]);
  const [b, f] = distinct(2, 1, 40);
  const [c, e] = distinct(2, 1, 200);
  const general = `${a}.*`;
  const mid = `${a}.${b}.*`;
  const specific = `${a}.${b}.${c}.*`;
  const variant = randInt(0, 3);
  if (variant === 0) return finalise([general, mid, specific], specific, finishAddress([a, b, c]), 'All three match: the longest wins');
  if (variant === 1) return finalise([general, mid, specific], mid, finishAddress([a, b, e]), `${specific} doesn't match, ${mid} is the longest that does`);
  if (variant === 2) return finalise([general, mid, specific], general, finishAddress([a, f]), `Only ${general} matches`);
  const other = pickOne([10, 172, 192].filter((x) => x !== a));
  return finalise([mid, `${other}.${f}.*`, '* default'], '* default', finishAddress([pickOne([8, 41, 77, 203]), f]), 'Nothing else matches: take the default route');
};

/* ---------- three.js helpers ---------- */

const labelTexture = (text: string, color: string) => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(10,6,24,0.9)';
  g.fillRect(0, 0, 512, 160);
  g.strokeStyle = color;
  g.lineWidth = 10;
  g.strokeRect(5, 5, 502, 150);
  g.fillStyle = '#ffffff';
  g.font = `900 ${text.length > 9 ? 70 : 84}px "JetBrains Mono", Consolas, monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

const sunTexture = () => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#fde047');
  grad.addColorStop(0.55, '#f472b6');
  grad.addColorStop(1, '#7c3aed');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i += 1) g.fillRect(0, 150 + i * 15, 256, 3 + i * 1.4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

interface Gate { group: THREE.Group; route: Route; passed: boolean; textures: THREE.Texture[] }
interface Hazard { mesh: THREE.Object3D; kind: 'wall' | 'bit'; lane: number; done: boolean }
interface Bit3 { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }

export interface RunnerResult { score: number; routed: number; dropped: number; bits: number; distance: number }

const PacketRun: React.FC<{ onEnd: (r: RunnerResult) => void }> = ({ onEnd }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const hud = {
    score: useRef<HTMLSpanElement>(null),
    lives: useRef<HTMLSpanElement>(null),
    addr: useRef<HTMLDivElement>(null),
    lanes: [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)],
    toast: useRef<HTMLDivElement>(null),
    level: useRef<HTMLSpanElement>(null),
  };
  const ready = useReady(3);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const [noGl, setNoGl] = useState(false);
  const world = useRef<ReturnType<typeof buildWorld> | null>(null);

  const s = useRef({
    lane: 1,
    x: 0,
    speed: 20,
    dist: 0,
    time: 0,
    nextGateAt: 40,
    lastGateAt: -999,
    nextHazardAt: 60,
    lives: 3,
    invuln: 0,
    score: 0,
    routed: 0,
    dropped: 0,
    bits: 0,
    shake: 0,
    toast: 0,
    dying: 0,
    ended: false,
    hudKey: '',
  }).current;

  const showToast = (text: string, tone: 'good' | 'bad', sub = '') => {
    const el = hud.toast.current;
    if (!el) return;
    el.innerHTML = '';
    const main = document.createElement('div');
    main.textContent = text;
    main.className = `text-[26px] font-black tracking-tight ${tone === 'good' ? 'text-emerald-300' : 'text-rose-300'}`;
    el.appendChild(main);
    if (sub) {
      const small = document.createElement('div');
      small.textContent = sub;
      small.className = 'mt-1 text-[13px] font-semibold text-white/85';
      el.appendChild(small);
    }
    el.style.opacity = '1';
    s.toast = tone === 'bad' ? 2.4 : 1.2;
  };

  const move = (dir: number) => {
    if (s.dying || readyRef.current > 0) return;
    const next = clamp(s.lane + dir, 0, 2);
    if (next !== s.lane) {
      s.lane = next;
      sfx.tone(dir < 0 ? 420 : 520, 0.06, { type: 'triangle', vol: 0.12 });
    }
  };

  // Scene setup / teardown
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let w: ReturnType<typeof buildWorld>;
    try {
      w = buildWorld(mount);
    } catch {
      setNoGl(true);
      return;
    }
    world.current = w;
    const ro = new ResizeObserver(() => w.resize());
    ro.observe(mount);
    return () => {
      ro.disconnect();
      w.dispose();
      world.current = null;
    };
  }, []);

  // Controls: arrows / A-D, swipe, or tap a side of the screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      sfx.unlock();
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') move(-1);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') move(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const touch = useRef<{ x: number; used: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    sfx.unlock();
    touch.current = { x: e.clientX, used: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const t = touch.current;
    if (!t || t.used) return;
    if (Math.abs(e.clientX - t.x) > 28) {
      move(e.clientX > t.x ? 1 : -1);
      t.used = true;
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t || t.used) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    move(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
  };

  const updateHud = () => {
    const gate = world.current?.gates.find((g) => !g.passed);
    const key = `${Math.floor(s.score)}|${s.lives}|${s.lane}|${gate ? gate.route.address : ''}`;
    if (key === s.hudKey) return;
    s.hudKey = key;
    if (hud.score.current) hud.score.current.textContent = String(Math.floor(s.score));
    if (hud.lives.current) hud.lives.current.textContent = '◆'.repeat(Math.max(0, s.lives)) + '◇'.repeat(Math.max(0, 3 - s.lives));
    if (hud.level.current) hud.level.current.textContent = s.routed < 4 ? 'LEVEL 1 · networks' : s.routed < 9 ? 'LEVEL 2 · subnets' : 'LEVEL 3 · longest match';
    if (hud.addr.current) {
      hud.addr.current.textContent = gate ? gate.route.address : '—';
      hud.addr.current.parentElement!.style.opacity = gate ? '1' : '0.4';
    }
    hud.lanes.forEach((r, i) => {
      const el = r.current;
      if (!el) return;
      el.textContent = gate ? gate.route.labels[i] : '';
      el.style.visibility = gate ? 'visible' : 'hidden';
      el.dataset.active = String(i === s.lane);
    });
  };

  const crash = (w: NonNullable<typeof world.current>, pos: THREE.Vector3, color: number, text: string, sub = '') => {
    s.lives -= 1;
    s.invuln = 1.4;
    s.shake = 0.5;
    w.burst(pos, color, 26);
    sfx.hurt();
    showToast(text, 'bad', sub);
    if (s.lives <= 0) {
      s.dying = 1.8;
      w.player.visible = false;
      w.burst(w.player.position, 0xf472b6, 60);
      w.burst(w.player.position, 0x22d3ee, 30);
      sfx.boom();
      sfx.gameOver();
    }
  };

  useGameLoop(true, (dt) => {
    const w = world.current;
    if (!w) return;
    s.time += dt;
    const live = readyRef.current <= 0 && !s.dying && !s.ended;

    if (s.dying && !s.ended) {
      s.dying -= dt;
      if (s.dying <= 0) {
        s.ended = true;
        endRef.current({ score: Math.floor(s.score), routed: s.routed, dropped: s.dropped, bits: s.bits, distance: Math.floor(s.dist) });
      }
    }

    const speed = live ? s.speed : s.dying ? s.speed * Math.max(0, s.dying / 1.8) : 0;
    if (live) {
      s.speed = Math.min(50, 20 + s.time * 0.32);
      s.dist += speed * dt;
      s.score += speed * dt * 0.5;

      if (s.dist >= s.nextGateAt) {
        w.spawnGate(makeRoute(s.routed + w.gates.filter((g) => !g.passed).length));
        s.lastGateAt = s.nextGateAt;
        s.nextGateAt += GATE_GAP;
        s.nextHazardAt = s.lastGateAt + 26;
      }
      if (s.dist >= s.nextHazardAt) {
        if (s.nextHazardAt <= s.lastGateAt + GATE_GAP - 50) w.spawnHazardRow(s.routed);
        s.nextHazardAt += rand(22, 34);
      }
    }

    // Player
    s.x += (LANES[s.lane] - s.x) * Math.min(1, dt * 12);
    w.player.position.x = s.x;
    w.player.position.y = 0.9 + Math.sin(s.time * 4) * 0.1;
    w.player.rotation.z = (LANES[s.lane] - s.x) * -0.18;
    w.core.rotation.x += dt * 2.2;
    w.core.rotation.y += dt * 3;
    w.shell.rotation.y -= dt * 1.4;
    s.invuln = Math.max(0, s.invuln - dt);
    if (!s.dying) w.player.visible = s.invuln <= 0 || Math.floor(s.time * 14) % 2 === 0;

    w.scroll(speed * dt, s.time);

    // Gates
    for (const g of w.gates) {
      g.group.position.z += speed * dt;
      if (!g.passed && g.group.position.z >= 0) {
        g.passed = true;
        const ok = s.lane === g.route.correct;
        if (ok) {
          s.routed += 1;
          const level = s.routed <= 4 ? 1 : s.routed <= 9 ? 2 : 3;
          s.score += 100 * level;
          w.flashGate(g, g.route.correct, 0x4ade80);
          sfx.good();
          showToast(`ROUTED  +${100 * level}`, 'good');
          if (s.routed === 4 || s.routed === 9) {
            sfx.levelUp();
            showToast(s.routed === 4 ? 'LEVEL 2: SUBNETS' : 'LEVEL 3: OVERLAPPING ROUTES', 'good', s.routed === 4 ? 'Look past the first number' : 'Several routes match? The most specific wins');
          }
        } else if (!s.dying) {
          s.dropped += 1;
          w.flashGate(g, s.lane, 0xfb7185);
          crash(w, w.player.position, 0xfb7185, 'PACKET DROPPED', `${g.route.address} → ${g.route.labels[g.route.correct]}. ${g.route.why}.`);
        }
      }
    }
    w.cullGates();

    // Hazards
    for (const h of w.hazards) {
      h.mesh.position.z += speed * dt;
      if (h.kind === 'bit') h.mesh.rotation.y += dt * 4;
      if (!h.done && !s.dying && Math.abs(h.mesh.position.z) < 0.9 && h.lane === s.lane && Math.abs(s.x - LANES[h.lane]) < 1.2) {
        h.done = true;
        if (h.kind === 'bit') {
          s.bits += 1;
          s.score += 10;
          h.mesh.visible = false;
          w.burst(h.mesh.position, 0xfacc15, 6);
          sfx.coin();
        } else if (s.invuln <= 0) {
          h.mesh.visible = false;
          crash(w, h.mesh.position, 0xef4444, 'FIREWALL!', 'Swerve round the red walls');
        }
      }
    }
    w.cullHazards();
    w.updateBits(dt);

    // Camera follows a little, and shakes on hits
    s.shake = Math.max(0, s.shake - dt);
    const sh = s.shake * 0.5;
    w.camera.position.set(s.x * 0.35 + rand(-sh, sh), 3.4 + rand(-sh, sh), 7);
    w.camera.lookAt(s.x * 0.2, 1, -12);
    (w.camera as THREE.PerspectiveCamera).fov = 66 + (speed - 20) * 0.25;
    w.camera.updateProjectionMatrix();

    s.toast = Math.max(0, s.toast - dt);
    if (hud.toast.current && s.toast <= 0) hud.toast.current.style.opacity = '0';

    updateHud();
    w.render();
  });

  return (
    <Stage aspect={ASPECT} maxWidth={600}>
      <div
        ref={mountRef}
        className="absolute inset-0"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      />
      {noGl && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-white">
          This device can't show 3D graphics (WebGL is off or unsupported). Try another browser.
        </div>
      )}
      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 pr-24 text-white">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/55">Score</p>
          <span ref={hud.score} className="text-[24px] font-black tabular-nums leading-none">0</span>
          <p className="mt-1"><span ref={hud.lives} className="text-[16px] tracking-[0.2em] text-cyan-300">◆◆◆</span></p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[13%] flex flex-col items-center text-white">
        <span ref={hud.level} className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-300" />
        <div className="border border-cyan-300/60 bg-black/60 px-4 py-1.5 text-center backdrop-blur-sm">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-cyan-200/80">Packet to</p>
          <div ref={hud.addr} className="font-mono text-[22px] font-black leading-tight sm:text-[26px]">—</div>
        </div>
      </div>
      <div ref={hud.toast} className="pointer-events-none absolute inset-x-6 top-[36%] text-center opacity-0 transition-opacity duration-200 [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-3 gap-1.5 p-2">
        {hud.lanes.map((r, i) => (
          <div
            key={i}
            ref={r}
            data-active="false"
            className="border border-white/25 bg-black/60 py-2 text-center font-mono text-[13px] font-bold text-white/80 backdrop-blur-sm data-[active=true]:border-pink-400 data-[active=true]:bg-pink-500/30 data-[active=true]:text-white sm:text-[15px]"
          />
        ))}
      </div>
      <ReadyOverlay count={ready} title="Packet Runner" hint="← → or swipe to change lanes. Go through the route that matches the address." />
    </Stage>
  );
};

/* ---------- world ---------- */

function buildWorld(mount: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const scene = new THREE.Scene();
  const bg = new THREE.Color(0x0a0618);
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 30, 150);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 400);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(2, 6, 4);
  scene.add(dir);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  // Sun
  const sun = new THREE.Mesh(track(new THREE.CircleGeometry(38, 48)), track(new THREE.MeshBasicMaterial({ map: track(sunTexture()), transparent: true, fog: false })));
  sun.position.set(0, 16, -220);
  scene.add(sun);

  // Floor
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(60, 420)), track(new THREE.MeshBasicMaterial({ color: 0x0d0820 })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -180;
  scene.add(floor);
  const grid = new THREE.GridHelper(60, 30, 0xa78bfa, 0x6d28d9);
  grid.scale.z = 7;
  grid.position.set(0, 0.01, -180);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.45;
  track(grid.geometry);
  track(grid.material as THREE.Material);
  scene.add(grid);

  // Lane rails
  const railGeo = track(new THREE.BoxGeometry(0.08, 0.04, 400));
  const railMat = track(new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
  [-3.6, -1.2, 1.2, 3.6].forEach((x) => {
    const r = new THREE.Mesh(railGeo, railMat);
    r.position.set(x, 0.03, -190);
    scene.add(r);
  });

  // Pillars either side
  const pillarGeo = track(new THREE.BoxGeometry(0.6, 1, 0.6));
  const pillarMats = [0xf472b6, 0xa78bfa, 0x22d3ee].map((c) => track(new THREE.MeshBasicMaterial({ color: c })));
  const pillars: THREE.Mesh[] = [];
  for (let i = 0; i < 36; i += 1) {
    const p = new THREE.Mesh(pillarGeo, pillarMats[i % 3]);
    const h = rand(1, 9);
    p.scale.y = h;
    p.position.set(i % 2 ? 7 + rand(0, 4) : -7 - rand(0, 4), h / 2, -i * 9);
    scene.add(p);
    pillars.push(p);
  }

  // Floating data specks
  const speckCount = 500;
  const speckPos = new Float32Array(speckCount * 3);
  for (let i = 0; i < speckCount; i += 1) {
    speckPos[i * 3] = rand(-30, 30);
    speckPos[i * 3 + 1] = rand(0.5, 22);
    speckPos[i * 3 + 2] = rand(-220, 10);
  }
  const speckGeo = track(new THREE.BufferGeometry());
  speckGeo.setAttribute('position', new THREE.BufferAttribute(speckPos, 3));
  const specks = new THREE.Points(speckGeo, track(new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.12, transparent: true, opacity: 0.8 })));
  scene.add(specks);

  // Player packet
  const player = new THREE.Group();
  const core = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 0.75, 0.75)), track(new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xdb2777, emissiveIntensity: 1.2, roughness: 0.3 })));
  const shell = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.85, 0)), track(new THREE.MeshBasicMaterial({ color: 0x67e8f9, wireframe: true, transparent: true, opacity: 0.7 })));
  const glow = new THREE.PointLight(0xf472b6, 18, 9);
  glow.position.y = 0.3;
  const shadow = new THREE.Mesh(track(new THREE.CircleGeometry(0.7, 24)), track(new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.25 })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.85;
  player.add(core, shell, glow, shadow);
  scene.add(player);

  // Shared hazard pieces
  const wallGeo = track(new THREE.BoxGeometry(2, 1.8, 0.35));
  const wallMat = track(new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 1, transparent: true, opacity: 0.85 }));
  const wallEdge = track(new THREE.EdgesGeometry(wallGeo));
  const wallEdgeMat = track(new THREE.LineBasicMaterial({ color: 0xfecaca }));
  const bitGeo = track(new THREE.OctahedronGeometry(0.35, 0));
  const bitMat = track(new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 1.3 }));
  const postGeo = track(new THREE.BoxGeometry(0.22, 3, 0.22));
  const beamGeo = track(new THREE.BoxGeometry(2.3, 0.22, 0.22));
  const portalGeo = track(new THREE.PlaneGeometry(2, 2.8));
  const labelGeo = track(new THREE.PlaneGeometry(2.2, 0.7));
  const debrisGeo = track(new THREE.BoxGeometry(0.16, 0.16, 0.16));
  const debrisMats = new Map<number, THREE.MeshBasicMaterial>();

  const gates: Gate[] = [];
  const hazards: Hazard[] = [];
  const debris: Bit3[] = [];

  const spawnGate = (route: Route) => {
    const group = new THREE.Group();
    const textures: THREE.Texture[] = [];
    route.labels.forEach((label, i) => {
      const x = LANES[i];
      const postMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
      const l = new THREE.Mesh(postGeo, postMat);
      l.position.set(x - 1.08, 1.5, 0);
      const r = new THREE.Mesh(postGeo, postMat);
      r.position.set(x + 1.08, 1.5, 0);
      const beam = new THREE.Mesh(beamGeo, postMat);
      beam.position.set(x, 3, 0);
      const portal = new THREE.Mesh(portalGeo, new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
      portal.position.set(x, 1.45, 0);
      portal.name = `portal${i}`;
      const tex = labelTexture(label, '#22d3ee');
      textures.push(tex);
      const sign = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      sign.position.set(x, 3.55, 0);
      group.add(l, r, beam, portal, sign);
    });
    group.position.z = SPAWN_Z;
    scene.add(group);
    gates.push({ group, route, passed: false, textures });
  };

  const flashGate = (g: Gate, lane: number, color: number) => {
    const portal = g.group.getObjectByName(`portal${lane}`) as THREE.Mesh | undefined;
    if (portal) {
      const m = portal.material as THREE.MeshBasicMaterial;
      m.color.setHex(color);
      m.opacity = 0.55;
    }
    burst(new THREE.Vector3(LANES[lane], 1.4, 0.2), color, 22);
  };

  const disposeGroup = (obj: THREE.Object3D) => {
    obj.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (m && !disposables.includes(m as THREE.Material)) (Array.isArray(m) ? m : [m]).forEach((mm) => mm.dispose());
    });
  };

  const cullGates = () => {
    for (let i = gates.length - 1; i >= 0; i -= 1) {
      if (gates[i].group.position.z > 12) {
        scene.remove(gates[i].group);
        disposeGroup(gates[i].group);
        gates[i].textures.forEach((t) => t.dispose());
        gates.splice(i, 1);
      }
    }
  };

  const spawnHazardRow = (routed: number) => {
    const roll = Math.random();
    const wallChance = routed < 2 ? 0.45 : 0.6;
    if (roll < wallChance) {
      const blocked = shuffle([0, 1, 2]).slice(0, routed >= 3 && Math.random() < 0.45 ? 2 : 1);
      blocked.forEach((lane) => {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.add(new THREE.LineSegments(wallEdge, wallEdgeMat));
        wall.position.set(LANES[lane], 0.9, SPAWN_Z);
        scene.add(wall);
        hazards.push({ mesh: wall, kind: 'wall', lane, done: false });
      });
    } else {
      const lane = randInt(0, 2);
      for (let k = 0; k < 5; k += 1) {
        const bit = new THREE.Mesh(bitGeo, bitMat);
        bit.position.set(LANES[lane], 0.9, SPAWN_Z - k * 3.2);
        scene.add(bit);
        hazards.push({ mesh: bit, kind: 'bit', lane, done: false });
      }
    }
  };

  const cullHazards = () => {
    for (let i = hazards.length - 1; i >= 0; i -= 1) {
      if (hazards[i].mesh.position.z > 10) {
        scene.remove(hazards[i].mesh);
        hazards.splice(i, 1);
      }
    }
  };

  function burst(pos: THREE.Vector3, color: number, count: number) {
    let mat = debrisMats.get(color);
    if (!mat) {
      mat = track(new THREE.MeshBasicMaterial({ color, transparent: true }));
      debrisMats.set(color, mat);
    }
    for (let i = 0; i < count; i += 1) {
      const m = new THREE.Mesh(debrisGeo, mat);
      m.position.copy(pos);
      scene.add(m);
      debris.push({ mesh: m, vel: new THREE.Vector3(rand(-6, 6), rand(1, 8), rand(-4, 6)), life: rand(0.5, 1.1) });
    }
  }

  const updateBits = (dt: number) => {
    for (let i = debris.length - 1; i >= 0; i -= 1) {
      const d = debris[i];
      d.life -= dt;
      d.vel.y -= 14 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += dt * 8;
      d.mesh.scale.setScalar(Math.max(0.01, d.life));
      if (d.life <= 0) {
        scene.remove(d.mesh);
        debris.splice(i, 1);
      }
    }
  };

  const scroll = (dz: number, time: number) => {
    grid.position.z = -180 + ((grid.position.z + 180 + dz) % 14);
    for (const p of pillars) {
      p.position.z += dz;
      if (p.position.z > 10) p.position.z -= 36 * 9;
    }
    const pos = speckGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < speckCount; i += 1) {
      let z = pos.getZ(i) + dz * 1.2;
      if (z > 10) z -= 230;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    sun.position.y = 16 + Math.sin(time * 0.2) * 0.6;
  };

  const resize = () => {
    const { clientWidth: cw, clientHeight: ch } = mount;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  };
  resize();

  return {
    camera,
    player,
    core,
    shell,
    gates,
    hazards,
    spawnGate,
    flashGate,
    cullGates,
    spawnHazardRow,
    cullHazards,
    burst,
    updateBits,
    scroll,
    resize,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      gates.forEach((g) => { disposeGroup(g.group); g.textures.forEach((t) => t.dispose()); });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/* ---------- wrapper ---------- */

const PacketRunner: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [result, setResult] = useState<RunnerResult | null>(null);

  if (phase === 'play') {
    return (
      <PacketRun
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
          `Packets routed: ${result.routed}`,
          `Packets dropped: ${result.dropped}`,
          `Bits collected: ${result.bits}`,
          `Distance: ${result.distance} m`,
        ]}
        lesson="Routers read a packet's address and look it up in a routing table. When several routes match, the most specific (longest) one wins. When none match, the packet takes the default route. Every message you send hops through routers like this."
        onAgain={() => { sfx.unlock(); setPhase('play'); }}
      />
    );
  }

  return (
    <StartScreen
      concept="Networks and routing"
      howTo={[
        'You are a data packet racing through the network. Change lanes with ← → (or A / D). On a phone, swipe or tap either side.',
        'Each router has three routes. Your packet\'s address is at the top. Fly through the route it matches. 172.16.4.9 matches 172.16.*',
        'Later, routes overlap. If 10.*, 10.4.* and 10.4.7.* all match, the most specific one (10.4.7.*) wins. If none match, take * default.',
        'Dodge the red firewalls, grab the gold bits, and route as many packets as you can. It keeps getting faster.',
      ]}
      onStart={() => { sfx.unlock(); setPhase('play'); }}
    />
  );
};

export default PacketRunner;
