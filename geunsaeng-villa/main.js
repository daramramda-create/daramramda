// 근생빌라: ?cut=1..4 로 컷을 고른다. 1080×1920, 정사영 등각 카메라.
import * as THREE from 'three';
import { clamp, seg, ss, lerp } from '/core/lib.js';
import { makePost } from './post.js';
import { BUILD } from './scenes.js';
import { CUTS, SAFE } from './story.js';

const QS = new URLSearchParams(location.search);
const CUT = +(QS.get('cut') || 1), CD = CUTS[CUT];
const W = innerWidth || 1080, H = innerHeight || 1920, PX = W / 1080;
const SSAA = +(QS.get('ssaa') ?? 2);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const g = ov.getContext('2d');

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5, 5, 9, -9, 1, 500);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, aoRadius: .5, aoScale: 1.3, aoThickness: .8 });
post.bloom.strength = .18; post.bloom.threshold = .92; post.bloom.radius = .5;
post.tilt.maxR.value = 2 * SSAA;
const hemi = new THREE.HemisphereLight('#f4f0ff', '#d9c2a8', 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3e2', 2.4); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02; sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 60 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);

await Promise.all([`400 60px "Jua"`, `400 86px "Black Han Sans"`, `700 100px "Gaegu"`, `20px "Noto Color Emoji"`].map(f => document.fonts.load(f, '가나다✅😱🚨')));
const S = BUILD[CUT](scene);
const DEG = Math.PI / 180;
// 안전지대 중심(y 875)이 화면 중심보다 위: 그만큼 그림을 올린다
const SAFE_SHIFT = ((H / PX) / 2 - (SAFE.t + SAFE.b) / 2) / (H / PX);
let CAM;
function setCam(t) {
  const c = S.cam(t); CAM = c;
  const D = Math.max(60, c.fh * 3), ce = Math.cos(c.el * DEG);
  camera.position.set(c.tg[0] + D * ce * Math.sin(c.az * DEG), c.tg[1] + D * Math.sin(c.el * DEG), c.tg[2] + D * ce * Math.cos(c.az * DEG));
  camera.up.set(0, 1, 0); camera.lookAt(...c.tg);
  const fw = c.fh * W / H, d = (SAFE_SHIFT + (c.oy || 0)) * c.fh;
  camera.left = -fw / 2; camera.right = fw / 2; camera.top = c.fh / 2 - d; camera.bottom = -c.fh / 2 - d;
  camera.near = 1; camera.far = D * 2 + 50; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  post.comp.camDist.value = D; post.comp.hz0.value = 1e4; post.comp.hz1.value = 2e4;
  post.tilt.fy.value = .5; post.tilt.band.value = .34;
}
const toScreen = o => { const v = new THREE.Vector3(); o.getWorldPosition(v); v.project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
const vecScreen = v3 => { const v = v3.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };

// —————————————— 2D 레이어 ——————————————
const FONT_UI = '"Jua", "Noto Color Emoji"', FONT_HEAD = '"Black Han Sans", "Noto Color Emoji"';
const SH = 'rgba(28,38,78,.62)';
let TX = [];
function wrap(text, font, maxW) {
  g.font = font; const out = [];
  text.split('\n').join(' ').split(' ').forEach(w => { const last = out[out.length - 1]; if (last !== undefined && g.measureText(last + ' ' + w).width <= maxW) out[out.length - 1] = last + ' ' + w; else out.push(w); });
  return out;
}
function hexIcon(x, y, s, top) {
  const pts = [0, 1, 2, 3, 4, 5].map(i => [x + Math.cos(i * Math.PI / 3) * s, y + Math.sin(i * Math.PI / 3) * s * .58]), dy = s * .55;
  g.save(); g.shadowColor = 'transparent';
  g.fillStyle = '#b88a5e'; g.beginPath(); g.moveTo(...pts[0]); [0, 1, 2, 3].forEach(i => g.lineTo(pts[i][0], pts[i][1] + dy)); g.lineTo(...pts[3]); g.closePath(); g.fill();
  g.fillStyle = top; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill();
  g.restore();
}
// 글자가 하나씩 아래에서 솟아 튀는 텍스트 (타일처럼)
function riseText(lines, x, y0, lh, font, t, t0, opts = {}) {
  g.font = font; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  let k = 0;
  lines.forEach((line, li) => {
    const chars = [...line], ws = chars.map(c => g.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0);
    let cx = x - tot / 2; const y = y0 + li * lh;
    const hl = opts.hl ? line.indexOf(opts.hl) : -1, hlEnd = hl >= 0 ? hl + [...opts.hl].length : -1;
    chars.forEach((ch, i) => {
      const s = t - (t0 + k * (opts.step ?? .02)); k++;
      if (s > 0) {
        const off = s < .2 ? 60 * PX * Math.pow(1 - s / .2, 2) : -Math.sin((s - .2) * 16) * Math.exp(-(s - .2) * 8) * 9 * PX;
        g.save(); g.globalAlpha = (opts.alpha ?? 1) * clamp(s / .1);
        g.shadowColor = SH; g.shadowBlur = 18 * PX; g.shadowOffsetY = 4 * PX;
        if (opts.stroke) { g.lineJoin = 'round'; g.lineWidth = opts.stroke * PX; g.strokeStyle = opts.strokeC; g.strokeText(ch, cx, y + off); g.shadowColor = 'transparent'; }
        g.fillStyle = (i >= hl && i < hlEnd) ? opts.hlC : (opts.color || '#fffdf6'); g.fillText(ch, cx, y + off);
        g.restore();
      }
      cx += ws[i];
    });
  });
}
function bubble(b, t) {
  const a = S.anchors[b.who]; if (!a) return;
  const [ax, ay] = toScreen(a);
  const s = t - b.t0, out = 1 - ss(seg(t, b.t1 - .15, b.t1)), k = s < 0 ? 0 : Math.max(0, 1 - Math.exp(-s * 9) * Math.cos(s * 16));
  if (k <= .001 || out <= 0) return;
  const font = `400 ${50 * PX}px ${FONT_UI}`; g.font = font;
  const lines = b.text.split('\n'), lh = 62 * PX, tw = Math.max(...lines.map(l => g.measureText(l).width));
  const bw = tw + 70 * PX, bh = lines.length * lh + 46 * PX;
  const minY = (CD.title ? 560 : CD.head ? 470 : SAFE.t) * PX;
  let cx = clamp(ax, SAFE.l * PX + bw / 2, SAFE.r * PX - bw / 2), by = clamp(ay - 70 * PX - bh, minY, SAFE.b * PX - bh - 200 * PX);
  const cy = by + bh / 2;
  g.save(); g.globalAlpha = out; g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy);
  g.shadowColor = 'rgba(40,40,80,.22)'; g.shadowBlur = 20 * PX; g.shadowOffsetY = 6 * PX;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#4a3426'; g.lineWidth = 5 * PX;
  const r = 36 * PX, x0 = cx - bw / 2, y0 = by;
  const tipX = clamp(ax, x0 + r + 20 * PX, x0 + bw - r - 20 * PX), tipY = Math.max(ay - 18 * PX, y0 + bh + 26 * PX);
  g.beginPath();
  if (b.kind === 'think') {
    g.roundRect(x0, y0, bw, bh, bh / 2.2); g.fill(); g.shadowColor = 'transparent'; g.stroke();
    [[.35, 16], [.65, 10]].forEach(([u, rr]) => { g.beginPath(); g.arc(lerp(tipX, ax, u), lerp(y0 + bh + 14 * PX, tipY, u), rr * PX, 0, Math.PI * 2); g.fill(); g.stroke(); });
  } else {
    g.roundRect(x0, y0, bw, bh, r); g.fill(); g.shadowColor = 'transparent'; g.stroke();
    g.beginPath(); g.moveTo(tipX - 22 * PX, y0 + bh - 3 * PX); g.lineTo(tipX, tipY); g.lineTo(tipX + 22 * PX, y0 + bh - 3 * PX); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(tipX - 22 * PX, y0 + bh); g.lineTo(tipX, tipY); g.lineTo(tipX + 22 * PX, y0 + bh); g.stroke();
  }
  g.fillStyle = '#4a3426'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, cx, y0 + 23 * PX + lh * (i + .5) + 2 * PX));
  g.restore();
  if (s >= .3) TX.push({ id: 'bubble' + b.t0, text: b.text, x0, y0, x1: x0 + bw, y1: y0 + bh });
}
const iconTop = { 1: '#f6b9b0', 2: '#e4473f', 3: '#f2796b', 4: '#4fae7a' }[CUT];
function hud(t) {
  g.clearRect(0, 0, W, H); TX = [];
  if (QS.get('nohud')) return;
  // 컷1 POV 타이틀
  if (CD.title) {
    const lines = CD.title.text.split('\n'), font = `400 ${60 * PX}px ${FONT_UI}`;
    riseText(lines, W / 2, 330 * PX, 78 * PX, font, t, CD.title.t0, { hl: '근린생활시설', hlC: '#ffe36e', step: .012, stroke: 10, strokeC: '#5a4a8a' });
    g.font = font; const tw = Math.max(...lines.map(l => g.measureText(l).width));
    TX.push({ id: 'title', text: CD.title.text, x0: W / 2 - tw / 2, y0: 280 * PX, x1: W / 2 + tw / 2, y1: (330 + 78 * 2 + 20) * PX });
  }
  // 헤드라인
  if (CD.head && t >= CD.head.t0) {
    let fs = 86; g.font = `400 ${fs * PX}px ${FONT_HEAD}`; const mw = g.measureText(CD.head.text).width; if (mw > 800 * PX) fs = Math.floor(fs * 800 * PX / mw);
    const font = `400 ${fs * PX}px ${FONT_HEAD}`;
    riseText([CD.head.text], W / 2, 360 * PX, 0, font, t, CD.head.t0, { step: .04, color: '#ffffff', stroke: 14, strokeC: CUT === 2 ? '#c8323a' : '#5a4a8a' });
    g.font = font; const tw = g.measureText(CD.head.text).width;
    TX.push({ id: 'head', text: CD.head.text, x0: W / 2 - tw / 2, y0: 280 * PX, x1: W / 2 + tw / 2, y1: 390 * PX });
  }
  (CD.bubbles || []).forEach(b => { if (t >= b.t0 && t < b.t1) bubble(b, t); });
  // 칠판 글씨 (readcheck 용 상자)
  if (S.boardLines) S.boardLines().forEach((L, i) => {
    if (t < L.t0 + .8) return;
    const ys = [190, 440, 700][i], a = vecScreen(S.bpt(40, ys - 90)), b = vecScreen(S.bpt(1400, ys + 90));
    TX.push({ id: 'board' + i, text: L.text, x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) });
  });
  // 자막 (나레이션)
  const sub = (CD.subs || []).find(s => t >= s.t0 && t < s.t1);
  if (sub) {
    const al = ss(seg(t, sub.t0, sub.t0 + .15)) * (1 - ss(seg(t, sub.t1 - .12, sub.t1)));
    const font = `400 ${46 * PX}px ${FONT_UI}`, lines = wrap(sub.text, font, 760 * PX), lh = 62 * PX;
    const yb = (SAFE.b - 30) * PX, y0 = yb - (lines.length - 1) * lh;
    g.save(); g.globalAlpha = al; g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const tw = Math.max(...lines.map(l => g.measureText(l).width));
    hexIcon(W / 2 - tw / 2 - 34 * PX, y0 - 16 * PX, 17 * PX, iconTop);
    lines.forEach((l, i) => {
      g.lineJoin = 'round'; g.lineWidth = 9 * PX; g.strokeStyle = 'rgba(40,46,92,.82)'; g.shadowColor = SH; g.shadowBlur = 16 * PX; g.shadowOffsetY = 3 * PX;
      g.strokeText(l, W / 2, y0 + i * lh); g.shadowColor = 'transparent'; g.fillStyle = '#fffdf6'; g.fillText(l, W / 2, y0 + i * lh);
    });
    g.restore();
  }
  if (QS.get('safe')) { g.save(); g.strokeStyle = 'rgba(255,0,80,.8)'; g.lineWidth = 3; g.setLineDash([14, 10]); g.strokeRect(SAFE.l * PX, SAFE.t * PX, (SAFE.r - SAFE.l) * PX, (SAFE.b - SAFE.t) * PX); g.restore(); }
}

function render(t) {
  setCam(t);
  const sk = S.sky;
  post.comp.zen.value.set(sk.zen); post.comp.hor.value.set(sk.hor);
  const se = S.sun.el * DEG, sa = (S.sun.az + CAM.az) * DEG;
  sun.target.position.set(0, 0, 0); sun.position.set(Math.cos(se) * Math.sin(sa) * 30, Math.sin(se) * 30, Math.cos(se) * Math.cos(sa) * 30);
  const gd = post.grade; gd.sat.value = 1.04; gd.contrast.value = .05; gd.lift.value.setRGB(.02, .018, .03); gd.vig.value = .1;
  S.update(t, CAM);
  post.composer.render();
  hud(t);
}
window.TEXTS = t => { render(t); return TX; };

function events() {
  const ev = S.EV.slice();
  (CD.bubbles || []).forEach(b => ev.push({ t: b.t0, type: 'bubbleText', who: b.who }));
  if (CD.head) ev.push({ t: CD.head.t0, type: 'head' });
  ev.push({ t: 0, type: 'amb', what: ['', 'room', 'bank', 'drone', 'class'][CUT], d: S.dur });
  return ev.sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = S.dur; window.EV = events(); window.DBG = { camera, scene, S };
render(+(QS.get('t') ?? 1));
window.READY = true;
