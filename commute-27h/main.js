// 출퇴근 27시간: ?cut=1..4. 1080×1920, 원근 카메라 + 틸트시프트 후처리.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, seg, ss, lerp } from '/core/lib.js';
import { makePost } from './post.js';
import { CUTS, SAFE } from './story.js';

const QS = new URLSearchParams(location.search);
const CUT = +(QS.get('cut') || 1), CD = CUTS[CUT];
const W = innerWidth || 1080, H = innerHeight || 1920, PX = W / 1080;
const SSAA = +(QS.get('ssaa') ?? 2);
await Promise.all(['700 40px "Noto Sans KR"', '900 40px "Noto Sans KR"', '600 30px "Overpass Mono"'].map(f => document.fonts.load(f, '가나다27×')));
const { BUILD } = await import('./scenes.js');

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const g = ov.getContext('2d');

const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .35;
const camera = new THREE.PerspectiveCamera(30, W / H, .1, 3000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: !QS.has('noao'), aoRadius: 1.2, aoThickness: 1.5, aoScale: 1.3, aoAmt: .7 });
post.bloom.strength = .18; post.bloom.threshold = 1.1; post.bloom.radius = .5;
const hemi = new THREE.HemisphereLight('#cfe3ff', '#e0b98c', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 3.0); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
// 파스텔 하늘 배경 (화면 세로 그라데이션)
const skyTex = (top, bot) => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bot); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

const S = BUILD[CUT](scene, { camera, W, H });
scene.background = skyTex(S.sky[0], S.sky[1]);
const DEG = Math.PI / 180;
const proj = v => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
let CAM;
function setCam(t) {
  const c = S.cam(t); CAM = c;
  camera.fov = c.fov; camera.near = c.near || .1; camera.far = c.far || 3000; camera.position.set(...c.pos); camera.up.set(...(c.up || [0, 1, 0])); camera.lookAt(...c.look); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const d = post.dof, b = c.band || {};
  d.focus = c.focus ?? camera.position.distanceTo(new THREE.Vector3(...c.look)); d.aper = c.aper ?? 30; d.maxCoc = (c.maxCoc ?? 22) * PX;
  // 초점 띠: 세계 좌표 지점을 화면에 투영해 띠를 그 위치로
  let by = b.y ?? .5; if (b.at) by = 1 - proj(new THREE.Vector3(...b.at))[1] / H;
  Object.assign(d.band, { y: by, w: b.w ?? .07, amp: (b.amp ?? 24) * PX, mix: b.mix ?? .6, tilt: 0, pow: 1.3 });
  const sn = S.sun(t), se = sn.el * DEG, sa = sn.az * DEG, tg = new THREE.Vector3(...sn.target);
  sun.target.position.copy(tg); sun.position.set(tg.x + Math.cos(se) * Math.sin(sa) * 200, tg.y + Math.sin(se) * 200, tg.z + Math.cos(se) * Math.cos(sa) * 200);
  Object.assign(sun.shadow.camera, { left: -sn.span, right: sn.span, top: sn.span, bottom: -sn.span, near: 1, far: 500 }); sun.shadow.camera.updateProjectionMatrix();
}

// —————————————— 2D: 표지판 자막 ——————————————
const SH = 'rgba(10,20,40,.35)';
let TX = [];
const parse = s => { const out = []; s.split(/(\[[^\]]+\])/).forEach(p => { if (!p) return; out.push(p[0] === '[' ? { t: p.slice(1, -1), hl: true } : { t: p, hl: false }); }); return out; };
const plain = s => s.replace(/[\[\]]/g, '');
function spansW(sp, font) { g.font = font; return sp.reduce((a, s) => a + g.measureText(s.t).width, 0); }
function drawSpans(sp, x, y, font, col, hl) { g.font = font; g.textAlign = 'left'; let cx = x; sp.forEach(s => { g.fillStyle = s.hl ? hl : col; g.fillText(s.t, cx, y); cx += g.measureText(s.t).width; }); }
function wrapSpans(text, font, maxW) {   // 단어 단위 줄바꿈 (강조 구간 유지)
  const words = []; parse(text).forEach(s => s.t.split(/(?<= )/).forEach(w => w && words.push({ t: w, hl: s.hl })));
  const lines = [[]]; g.font = font;
  words.forEach(w => { const L = lines[lines.length - 1]; const wd = spansW([...L, w], font); if (L.length && wd > maxW) lines.push([w]); else L.push(w); });
  return lines;
}
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
const popK = s => s <= 0 ? 0 : Math.max(0, 1 - Math.exp(-s * 10) * Math.cos(s * 16));
// 남색 안내판 (타이틀·헤드라인)
function boardPanel(text, cy, t, t0, fs, id) {
  const s = t - t0, k = popK(s); if (k <= 0) return;
  const font = `900 ${fs * PX}px "Noto Sans KR"`, sp = parse(text);
  let tw = spansW(sp, font), f = fs; if (tw > 780 * PX) { f = fs * 780 * PX / tw; tw = 780 * PX; }
  const fnt = `900 ${f * PX}px "Noto Sans KR"`; tw = spansW(sp, fnt);
  const pw = tw + 70 * PX, ph = f * PX * 1.55 + 26 * PX, x0 = W / 2 - pw / 2, y0 = cy - ph / 2;
  g.save(); g.translate(W / 2, cy); g.scale(k, k); g.translate(-W / 2, -cy);
  g.shadowColor = SH; g.shadowBlur = 24 * PX; g.shadowOffsetY = 8 * PX;
  g.fillStyle = '#1b2f5c'; rr(x0, y0, pw, ph, 16 * PX); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#2bb673'; rr(x0, y0, pw, 12 * PX, [16 * PX, 16 * PX, 0, 0]); g.fill();   // 노선색 띠
  g.textBaseline = 'middle'; drawSpans(sp, W / 2 - tw / 2, cy + 8 * PX, fnt, '#ffffff', '#ffd23f');
  g.restore();
  if (s > .3) TX.push({ id, text: plain(text), x0, y0, x1: x0 + pw, y1: y0 + ph });
}
// 파란 도로 표지판 자막
// 릴스 커버 제목: 흰 알약 + 굵은 남색 큰 글씨 두 줄 + 피치/민트 형광펜 띠
function coverTitle(T, t) {
  const NAVY = '#26305f', BARS = ['rgba(253,200,184,.88)', 'rgba(198,236,220,.92)'];
  const items = [];
  // 제목 뒤 흰 박스 (강조)
  { const k = popK(t - T.t0); if (k > 0) {
    const bw = 840 * PX, bh = 470 * PX, cy = 485 * PX, x0 = W / 2 - bw / 2;
    g.save(); g.translate(W / 2, cy); g.scale(k, k); g.translate(-W / 2, -cy);
    g.shadowColor = 'rgba(38,48,95,.22)'; g.shadowBlur = 34 * PX; g.shadowOffsetY = 10 * PX;
    g.fillStyle = 'rgba(255,255,255,.96)'; rr(x0, cy - bh / 2, bw, bh, 34 * PX); g.fill(); g.restore(); } }
  // 알약
  { const s = t - T.t0, k = popK(s); if (k > 0) {
    const font = `700 ${40 * PX}px "Noto Sans KR"`; g.font = font; const tw = g.measureText(T.pill).width;
    const pw = tw + 80 * PX, ph = 80 * PX, cy = 330 * PX, x0 = W / 2 - pw / 2;
    g.save(); g.translate(W / 2, cy); g.scale(k, k); g.translate(-W / 2, -cy);
    g.shadowColor = 'rgba(38,48,95,.18)'; g.shadowBlur = 20 * PX; g.shadowOffsetY = 5 * PX;
    g.fillStyle = '#eceefa'; rr(x0, cy - ph / 2, pw, ph, ph / 2); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T.pill, W / 2, cy + 3 * PX);
    g.restore(); items.push([x0, cy - ph / 2, x0 + pw, cy + ph / 2]); } }
  // 큰 두 줄
  T.lines.forEach((line, i) => {
    const s = t - (T.t0 + .12 + i * .14), k = popK(s); if (k <= 0) return;
    let fs = 132; g.font = `900 ${fs * PX}px "Noto Sans KR"`; let tw = g.measureText(line).width;
    if (tw > 740 * PX) { fs *= 740 * PX / tw; g.font = `900 ${fs * PX}px "Noto Sans KR"`; tw = g.measureText(line).width; }
    const cy = (480 + i * 158) * PX, x0 = W / 2 - tw / 2;
    g.save(); g.translate(W / 2, cy); g.scale(k, k); g.translate(-W / 2, -cy);
    g.fillStyle = BARS[i]; rr(x0 - 22 * PX, cy + fs * PX * .02, tw + 44 * PX, fs * PX * .42, 10 * PX); g.fill();   // 형광펜 띠 (글자 아래 절반)
    g.shadowColor = 'transparent';
    g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(line, W / 2, cy);
    g.shadowBlur = 0; g.shadowColor = 'transparent'; g.fillText(line, W / 2, cy);
    g.restore(); items.push([x0, cy - fs * PX * .55, x0 + tw, cy + fs * PX * .5]);
  });
  if (t - T.t0 > .5 && items.length) TX.push({ id: 'title', text: T.pill + T.lines.join(''), x0: Math.min(...items.map(b => b[0])), y0: items[0][1], x1: Math.max(...items.map(b => b[2])), y1: items[items.length - 1][3] });
}
function roadSign(sub, t) {
  const al = ss(seg(t, sub.t0, sub.t0 + .12)) * (1 - ss(seg(t, sub.t1 - .1, sub.t1)));
  const fs = sub.big ? 66 : 44, font = `${sub.big ? 900 : 700} ${fs * PX}px "Noto Sans KR"`;
  const lines = wrapSpans(sub.text, font, 760 * PX), lh = fs * 1.42 * PX;
  const tw = Math.max(...lines.map(l => spansW(l, font)));
  const pw = tw + 60 * PX, ph = lines.length * lh + 34 * PX, yb = (SAFE.b - 24) * PX, y0 = yb - ph, x0 = W / 2 - pw / 2;
  const k = 1 - Math.exp(-Math.max(0, t - sub.t0) * 14);
  g.save(); g.globalAlpha = al; g.translate(0, (1 - k) * 30 * PX);
  g.shadowColor = SH; g.shadowBlur = 18 * PX; g.shadowOffsetY = 6 * PX;
  g.fillStyle = '#0d55b3'; rr(x0, y0, pw, ph, 12 * PX); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = '#ffffff'; g.lineWidth = 4 * PX; rr(x0 + 8 * PX, y0 + 8 * PX, pw - 16 * PX, ph - 16 * PX, 8 * PX); g.stroke();
  g.textBaseline = 'middle';
  lines.forEach((l, i) => drawSpans(l, W / 2 - spansW(l, font) / 2, y0 + 17 * PX + lh * (i + .5) + 2 * PX, font, '#ffffff', '#ffd23f'));
  g.restore();
}
function termCard(c, t) {
  const s = t - c.t0, k = popK(s); if (k <= 0) return;
  const cy = 520 * PX, pw = 700 * PX, ph = 250 * PX, x0 = W / 2 - pw / 2, y0 = cy - ph / 2;
  g.save(); g.translate(W / 2, cy); g.scale(k, k); g.translate(-W / 2, -cy);
  g.shadowColor = SH; g.shadowBlur = 30 * PX; g.shadowOffsetY = 10 * PX;
  g.fillStyle = '#ffffff'; rr(x0, y0, pw, ph, 22 * PX); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#1b2f5c'; rr(x0, y0, pw, 92 * PX, [22 * PX, 22 * PX, 0, 0]); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd23f'; g.font = `900 ${70 * PX}px "Noto Sans KR"`; g.fillText(c.word, W / 2, y0 + 50 * PX);
  g.fillStyle = '#1b2f5c'; g.font = `900 ${50 * PX}px "Noto Sans KR"`; g.fillText(c.def, W / 2, y0 + 172 * PX);
  g.restore();
  if (s > .3) TX.push({ id: 'card', text: c.word + c.def, x0, y0, x1: x0 + pw, y1: y0 + ph });
}
function clockHud(t) {
  if (!CD.clock) return;
  let sp = CD.clock[0][1]; CD.clock.forEach(([a, v]) => { if (t >= a) sp = v; });
  const txt = sp > 1 ? `×${sp} TIME-LAPSE` : '×1 REAL TIME', font = `600 ${26 * PX}px "Overpass Mono"`;
  g.save(); g.font = font; const tw = g.measureText(txt).width, x1 = (SAFE.r - 6) * PX, x0 = x1 - tw - 64 * PX, y0 = (SAFE.t + (CD.title ? 150 : 0) + 6) * PX;
  if (CD.head && t >= CD.head.t0) { g.restore(); return; }
  g.fillStyle = 'rgba(15,22,36,.72)'; rr(x0, y0, x1 - x0, 46 * PX, 23 * PX); g.fill();
  const blink = sp > 1 ? (Math.floor(t * 4) % 2 ? 1 : .35) : 1;
  g.fillStyle = sp > 1 ? `rgba(255,80,70,${blink})` : '#4ade80'; g.beginPath(); g.arc(x0 + 24 * PX, y0 + 23 * PX, 8 * PX, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.fillText(txt, x0 + 44 * PX, y0 + 24 * PX);
  g.restore();
  TX.push({ id: 'clock' + sp, text: txt, x0, y0, x1, y1: y0 + 46 * PX, pass: true });
}
function hud(t) {
  g.clearRect(0, 0, W, H); TX = [];
  if (QS.get('nohud')) return;
  if (CD.title) coverTitle(CD.title, t);
  if (CD.head && t >= CD.head.t0) boardPanel(CD.head.text, 320 * PX, t, CD.head.t0, 58, 'head');
  if (CD.card) termCard(CD.card, t);
  clockHud(t);
  const sub = (CD.subs || []).find(s => t >= s.t0 && t < s.t1); if (sub) roadSign(sub, t);
  if (S.hud) S.hud(t, g, { proj, PX, W, H, TX });
  if (QS.get('safe')) { g.save(); g.strokeStyle = 'rgba(255,0,80,.8)'; g.lineWidth = 3; g.setLineDash([14, 10]); g.strokeRect(SAFE.l * PX, SAFE.t * PX, (SAFE.r - SAFE.l) * PX, (SAFE.b - SAFE.t) * PX); g.restore(); }
}

function render(t) {
  S.update(t);          // 배우 먼저 (초점이 한 프레임 늦지 않게)
  setCam(t);
  if (S.light) S.light(t, { sun, hemi });
  const gd = post.grade.uniforms; gd.sat.value = 1.16; gd.contrast.value = .22; gd.warm.value = .25; gd.amt.value = .26; gd.expo.value = S.expo ?? 1;
  post.composer.render();
  hud(t);
}
window.TEXTS = t => { render(t); return TX; };
window.render = render; window.DUR = S.dur; window.EV = S.EV.slice().sort((a, b) => a.t - b.t); window.DBG = { camera, scene, S, post };
render(+(QS.get('t') ?? 1));
window.READY = true;
