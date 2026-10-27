// Pátio logístico em nuvem de pontos (Three.js), controlado pelo progresso do scroll.
import * as THREE from 'three';

const WHITE = new THREE.Color('#e9eef2');
const DIM = new THREE.Color('#9fb0bd');
const LIME = new THREE.Color('#d4ff3f');
const WARM = new THREE.Color('#ffb36b');

const rand = (a, b) => a + Math.random() * (b - a);

class Cloud {
  constructor() { this.p = []; this.c = []; this.s = []; this.a = []; }
  add(x, y, z, color, size = 1, alpha = 1) {
    this.p.push(x, y, z); this.c.push(color.r, color.g, color.b); this.s.push(size); this.a.push(alpha);
  }
  line(a, b, step, color, size, alpha) {
    const d = a.distanceTo(b); const n = Math.max(2, Math.round(d / step));
    for (let i = 0; i <= n; i++) { const t = i / n; this.add(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, color, size, alpha); }
  }
  // caixa: arestas densas + faces esparsas
  box(cx, cy, cz, w, h, d, { edge = 0.35, face = 0, color = WHITE, size = 1.2, alpha = 1, faceAlpha = 0.35 } = {}) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy, y1 = cy + h, z0 = cz - d / 2, z1 = cz + d / 2;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const e = [[V(x0, y0, z0), V(x1, y0, z0)], [V(x0, y1, z0), V(x1, y1, z0)], [V(x0, y0, z1), V(x1, y0, z1)], [V(x0, y1, z1), V(x1, y1, z1)],
      [V(x0, y0, z0), V(x0, y1, z0)], [V(x1, y0, z0), V(x1, y1, z0)], [V(x0, y0, z1), V(x0, y1, z1)], [V(x1, y0, z1), V(x1, y1, z1)],
      [V(x0, y0, z0), V(x0, y0, z1)], [V(x1, y0, z0), V(x1, y0, z1)], [V(x0, y1, z0), V(x0, y1, z1)], [V(x1, y1, z0), V(x1, y1, z1)]];
    e.forEach(([a, b]) => this.line(a, b, edge, color, size, alpha));
    for (let i = 0; i < face; i++) {
      const f = Math.floor(Math.random() * 5); let x, y, z;
      if (f === 0) { x = rand(x0, x1); y = y1; z = rand(z0, z1); }
      else if (f === 1) { x = x0; y = rand(y0, y1); z = rand(z0, z1); }
      else if (f === 2) { x = x1; y = rand(y0, y1); z = rand(z0, z1); }
      else if (f === 3) { x = rand(x0, x1); y = rand(y0, y1); z = z0; }
      else { x = rand(x0, x1); y = rand(y0, y1); z = z1; }
      this.add(x, y, z, color, size * 0.8, faceAlpha);
    }
  }
}

const vert = /* glsl */`
  attribute vec3 color;
  attribute float size;
  attribute float alpha;
  attribute vec3 scatter;
  uniform float uAssemble;
  uniform float uPixel;
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float k = smoothstep(0.0, 1.0, uAssemble);
    vec3 pos = mix(scatter, position, k);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    gl_PointSize = max(size * uPixel * (230.0 / dist), 1.4 * uPixel);
    float fog = 1.0 - smoothstep(140.0, 340.0, dist);
    float twinkle = 0.85 + 0.15 * sin(uTime * 2.0 + position.x * 0.7 + position.z * 0.5);
    vColor = color;
    vAlpha = alpha * fog * twinkle * (0.25 + 0.75 * k);
  }
`;
const frag = /* glsl */`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, vAlpha * soft);
  }
`;

function makePoints(cloud, uniforms, scatterRadius = 140) {
  const g = new THREE.BufferGeometry();
  const n = cloud.s.length;
  g.setAttribute('position', new THREE.Float32BufferAttribute(cloud.p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cloud.c, 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(cloud.s, 1));
  g.setAttribute('alpha', new THREE.Float32BufferAttribute(cloud.a, 1));
  const sc = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = scatterRadius * Math.cbrt(Math.random());
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    sc[i * 3] = r * Math.sin(ph) * Math.cos(th);
    sc[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.6 + 10;
    sc[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  g.setAttribute('scatter', new THREE.Float32BufferAttribute(sc, 3));
  const m = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  return new THREE.Points(g, m);
}

export function createYard(canvas, { mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor('#07090b', 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 400);
  const uniforms = { uAssemble: { value: 0 }, uPixel: { value: dpr }, uTime: { value: 0 } };

  // ---------- Cenário estático ----------
  const S = new Cloud();
  const step = mobile ? 2.2 : 1.6;
  for (let x = -72; x <= 72; x += step) for (let z = -54; z <= 56; z += step) S.add(x + rand(-0.15, 0.15), 0, z + rand(-0.15, 0.15), DIM, 0.75, 0.42);
  // faixas do pátio
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const z of [-22, 6, 30]) S.line(V(-66, 0.05, z), V(66, 0.05, z), mobile ? 1.2 : 0.8, WHITE, 1, 0.5);
  for (const x of [-60, 60]) S.line(V(x, 0.05, -22), V(x, 0.05, 48), mobile ? 1.2 : 0.8, WHITE, 1, 0.4);
  // vagas de estacionamento (linhas curtas)
  for (let x = -52; x <= 52; x += 4.2) { S.line(V(x, 0.05, 8), V(x, 0.05, 22), 0.7, WHITE, 0.9, 0.35); }

  // galpão + docas
  const docks = [];
  S.box(0, 0, -47, 110, 13, 18, { edge: mobile ? 0.6 : 0.35, face: mobile ? 2200 : 5000, color: WHITE, size: 1.3, alpha: 0.95, faceAlpha: 0.22 });
  for (let i = 0; i < 16; i++) {
    const x = -46 + i * 6.1;
    const on = [2, 5, 6, 9, 12, 14].includes(i);
    const col = on ? WARM : WHITE;
    S.line(V(x - 1.5, 0, -37.9), V(x - 1.5, 4.2, -37.9), 0.25, col, 1.1, 0.9);
    S.line(V(x + 1.5, 0, -37.9), V(x + 1.5, 4.2, -37.9), 0.25, col, 1.1, 0.9);
    S.line(V(x - 1.5, 4.2, -37.9), V(x + 1.5, 4.2, -37.9), 0.25, col, 1.1, 0.9);
    if (on) for (let k = 0; k < 40; k++) S.add(x + rand(-1.4, 1.4), rand(0.1, 4.1), -37.8, WARM, 1, 0.55);
    docks.push({ pos: V(x, 5.2, -37.5), on, i });
  }
  // carretas encostadas nas docas
  [0, 2, 3, 5, 6, 8, 9, 12, 14, 15].forEach((i) => {
    const x = -46 + i * 6.1;
    S.box(x, 0.6, -31, 2.6, 3.6, 13, { edge: mobile ? 0.55 : 0.4, face: mobile ? 60 : 160, color: WHITE, size: 1.1, alpha: 0.8 });
  });
  // fileira estacionada no meio
  const parked = [];
  for (let x = -50; x <= 50; x += 4.2) {
    if (Math.random() < 0.28) continue;
    S.box(x, 0.6, 15, 2.6, 3.6, 13, { edge: mobile ? 0.6 : 0.45, face: mobile ? 40 : 110, color: WHITE, size: 1.05, alpha: 0.7 });
    parked.push(x);
  }
  // portão de entrada
  const gate = V(62, 6.5, 42);
  S.box(56.5, 0, 42, 1, 7, 1, { edge: 0.25, color: WHITE, size: 1.2 });
  S.box(67.5, 0, 42, 1, 7, 1, { edge: 0.25, color: WHITE, size: 1.2 });
  S.line(V(56, 7, 42), V(68, 7, 42), 0.25, LIME, 1.4, 1);
  // guarita
  S.box(73, 0, 44, 4, 3.4, 4, { edge: 0.3, face: 60, color: WHITE, size: 1.1 });

  const staticPts = makePoints(S, uniforms);
  scene.add(staticPts);

  // ---------- Feixe de leitura no portão ----------
  const beamC = new Cloud();
  for (let y = 0.2; y <= 6.8; y += 0.18) beamC.add(0, y, 0, LIME, 1.6, 1);
  const beam = makePoints(beamC, uniforms, 4);
  beam.position.set(56.5, 0, 42);
  scene.add(beam);

  // ---------- Caminhões em movimento ----------
  const route = new THREE.CatmullRomCurve3([
    V(95, 0, 42), V(62, 0, 42), V(40, 0, 38), V(10, 0, 34), V(-30, 0, 30), V(-58, 0, 22),
    V(-58, 0, 0), V(-40, 0, -14), V(-10, 0, -18), V(25, 0, -16), V(52, 0, -6), V(60, 0, 18), V(62, 0, 42), V(95, 0, 46),
  ], false, 'catmullrom', 0.3);
  // trilha da rota (pontilhado verde-limão)
  const trail = new Cloud();
  const pts = route.getSpacedPoints(mobile ? 240 : 420);
  pts.forEach((p) => trail.add(p.x, 0.1, p.z, LIME, 1.1, 0.45));
  scene.add(makePoints(trail, uniforms, 60));

  const trucks = [];
  const truckCount = mobile ? 3 : 4;
  for (let i = 0; i < truckCount; i++) {
    const c = new Cloud();
    c.box(0, 0.6, -2.5, 2.6, 3.7, 12, { edge: mobile ? 0.5 : 0.32, face: mobile ? 90 : 220, color: WHITE, size: 1.2, alpha: 1 });
    c.box(0, 0.4, 6.6, 2.6, 3.2, 4.2, { edge: 0.3, face: 70, color: LIME, size: 1.25, alpha: 1 });
    const t = makePoints(c, uniforms, 30);
    scene.add(t);
    trucks.push({ obj: t, offset: i / truckCount, speed: 0.018 + i * 0.002 });
  }

  // ---------- Câmera (keyframes ligados ao scroll) ----------
  const camPos = new THREE.CatmullRomCurve3([V(0, 125, 80), V(78, 62, 92), V(58, 16, 32), V(-24, 12, 26), V(-60, 32, 70)]);
  const camLook = new THREE.CatmullRomCurve3([V(0, 0, 2), V(2, 0, 4), V(2, 4, -28), V(-10, 3, -34), V(0, 0, -6)]);
  const look = new THREE.Vector3();

  // ---------- Etiquetas que acompanham objetos 3D ----------
  const labelDefs = [
    { text: 'Portão 01', sub: 'leitura OCR', pos: gate, from: 0.12, to: 0.55 },
    { text: 'Doca 07', sub: 'descarregando', pos: docks[6].pos, from: 0.42, to: 0.86 },
    { text: 'Doca 13', sub: 'próxima: TR-4821', pos: docks[12].pos, from: 0.46, to: 0.86 },
    { text: 'TR-4821', sub: 'a caminho da doca 13', truck: 0, from: 0.2, to: 0.95 },
    { text: 'Fila prevista', sub: '−3 veículos', pos: V(-30, 6, 15), from: 0.66, to: 1 },
  ];

  let w = 1, h = 1;
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 72 : camera.aspect < 1.2 ? 60 : 48;
    camera.updateProjectionMatrix();
  };
  resize();

  const tmp = new THREE.Vector3();
  const project = (v) => { tmp.copy(v).project(camera); return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, visible: tmp.z < 1 && tmp.z > -1 }; };

  let clockStart = performance.now();
  const render = (progress, labelEls) => {
    const time = (performance.now() - clockStart) / 1000;
    uniforms.uTime.value = time;
    uniforms.uAssemble.value = Math.min(1, progress / 0.16);
    const p = Math.min(1, Math.max(0, progress));
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    camera.position.copy(camPos.getPoint(e));
    camLook.getPoint(e, look);
    camera.lookAt(look);

    // feixe do portão
    beam.position.x = 56.8 + (Math.sin(time * 2.2) * 0.5 + 0.5) * 10.4;

    // caminhões andando pela rota
    trucks.forEach((tr) => {
      const u = (time * tr.speed + tr.offset + p * 0.35) % 1;
      const pt = route.getPointAt(u);
      const tan = route.getTangentAt(u);
      tr.obj.position.copy(pt);
      tr.obj.rotation.y = Math.atan2(tan.x, tan.z);
      tr.pos = pt;
    });

    renderer.render(scene, camera);

    // etiquetas
    if (labelEls) labelDefs.forEach((d, i) => {
      const el = labelEls[i];
      const target = d.truck !== undefined ? (trucks[d.truck].pos ? tmp.copy(trucks[d.truck].pos).add(V(0, 6, 0)) : null) : d.pos;
      if (!target) return;
      const sp = project(target.clone ? target.clone() : target);
      const on = p >= d.from && p <= d.to && sp.visible && sp.x > -50 && sp.x < w + 50;
      el.classList.toggle('on', on);
      el.style.transform = `translate3d(${sp.x}px, ${sp.y}px, 0) translate(-50%, -120%)`;
    });
  };

  return { render, resize, labels: labelDefs, dispose: () => renderer.dispose() };
}
