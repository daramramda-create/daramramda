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
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: !QS.has('noao'), aoRadius: .45, aoThickness: .6, aoScale: 1.2, aoAmt: .7 });
post.bloom.strength = .18; post.bloom.threshold = 1.1; post.bloom.radius = .5;
const hemi = new THREE.HemisphereLight('#cfe3ff', '#e0b98c', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 3.0); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
// 파스텔 하늘 배경 (화면 세로 그라데이션)
const skyTex = (top, bot) => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bot); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

const S = BUILD[CUT](scene, { camera, W, H });
scene.background = skyTex(S.sky[0], S.sky[1]);
if (S.aoAmt !== undefined) post.dof.aoAmt = S.aoAmt;
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
    const bw = 840 * PX, bh = (T.pill ? 470 : 350) * PX, cy = ((T.pill ? 485 : 560) + (T.dy || 0)) * PX, x0 = W / 2 - bw / 2;
    g.save(); g.translate(W / 2, cy); g.scale(k, k); g.translate(-W / 2, -cy);
    g.shadowColor = 'rgba(38,48,95,.22)'; g.shadowBlur = 34 * PX; g.shadowOffsetY = 10 * PX;
    g.fillStyle = 'rgba(255,255,255,.7)'; rr(x0, cy - bh / 2, bw, bh, 34 * PX); g.fill(); g.restore(); } }
  // 알약
  if (T.pill) { const s = t - T.t0, k = popK(s); if (k > 0) {
    const font = `700 ${40 * PX}px "Noto Sans KR"`; g.font = font; const tw = g.measureText(T.pill).width;
    const pw = tw + 80 * PX, ph = 80 * PX, cy = (330 + (T.dy || 0)) * PX, x0 = W / 2 - pw / 2;
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
    const cy = (480 + (T.dy || 0) + i * 158) * PX, x0 = W / 2 - tw / 2;
    g.save(); g.translate(W / 2, cy); g.scale(k, k); g.translate(-W / 2, -cy);
    g.fillStyle = BARS[i]; rr(x0 - 22 * PX, cy + fs * PX * .02, tw + 44 * PX, fs * PX * .42, 10 * PX); g.fill();   // 형광펜 띠 (글자 아래 절반)
    g.shadowColor = 'transparent';
    g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(line, W / 2, cy);
    g.shadowBlur = 0; g.shadowColor = 'transparent'; g.fillText(line, W / 2, cy);
    g.restore(); items.push([x0, cy - fs * PX * .55, x0 + tw, cy + fs * PX * .5]);
  });
  if (t - T.t0 > .5 && items.length) TX.push({ id: 'title', text: (T.pill || '') + T.lines.join(''), x0: Math.min(...items.map(b => b[0])), y0: items[0][1], x1: Math.max(...items.map(b => b[2])), y1: items[items.length - 1][3] });
}
function roadSign(sub, t) {
  const al = ss(seg(t, sub.t0, sub.t0 + .12)) * (1 - ss(seg(t, sub.t1 - .1, sub.t1)));
  const fs = sub.big ? 82 : 54, font = `${sub.big ? 900 : 700} ${fs * PX}px "Noto Sans KR"`;
  const lines = wrapSpans(sub.text, font, 780 * PX), lh = fs * 1.38 * PX;
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
  const cy = 540 * PX, pw = 800 * PX, ph = 290 * PX, x0 = W / 2 - pw / 2, y0 = cy - ph / 2;
  g.save(); g.translate(W / 2, cy); g.scale(k, k); g.translate(-W / 2, -cy);
  g.shadowColor = SH; g.shadowBlur = 30 * PX; g.shadowOffsetY = 10 * PX;
  g.fillStyle = '#ffffff'; rr(x0, y0, pw, ph, 22 * PX); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#1b2f5c'; rr(x0, y0, pw, 112 * PX, [22 * PX, 22 * PX, 0, 0]); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd23f'; g.font = `900 ${86 * PX}px "Noto Sans KR"`; g.fillText(c.word, W / 2, y0 + 60 * PX);
  g.fillStyle = '#1b2f5c'; g.font = `900 ${60 * PX}px "Noto Sans KR"`; g.fillText(c.def, W / 2, y0 + 202 * PX);
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
// —— 분노 게이지 (화면 위 고정) ——
function gaugeAt(t) {
  const K = CD.gauge || [[0, 0]]; if (t <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) { const [a, va] = K[i], [b, vb] = K[i + 1]; if (t < b) { const u = (t - a) / (b - a); const st = Math.floor(u * 4) / 4, e = ss(seg(u, st, st + .12)); return lerp(va, vb, Math.min(1, st + e * .25)); } }
  return K[K.length - 1][1];
}
const gcol = v => { const a = [[0, [60, 207, 110]], [50, [255, 210, 63]], [100, [255, 59, 48]]]; let i = v < 50 ? 0 : 1; const u = clamp((v - a[i][0]) / 50); const c = a[i][1].map((x, k) => Math.round(lerp(x, a[i + 1][1][k], u))); return `rgb(${c})`; };
function gaugeHud(t) {
  if (!CD.gauge) return;
  const v = gaugeAt(t), boom = CD.boom ?? 1e9, bt = t - boom;
  let sx = 0, sy = 0; if (v > 70 && bt < 0) { const a = (v - 70) / 30 * 5 * PX; sx = Math.sin(t * 61) * a; sy = Math.cos(t * 47) * a; }
  const x0 = SAFE.l * PX + sx, w = (SAFE.r - SAFE.l) * PX, y0 = (SAFE.t + 8) * PX + sy, h = 88 * PX;
  g.save();
  g.shadowColor = SH; g.shadowBlur = 18 * PX; g.shadowOffsetY = 5 * PX;
  g.fillStyle = CD.sooty ? '#3a3a40' : '#1b2f5c'; rr(x0, y0, w, h, h / 2); g.fill(); g.shadowColor = 'transparent';
  g.font = `900 ${38 * PX}px "Noto Sans KR"`; g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillText('분노 게이지', x0 + 30 * PX, y0 + h / 2 + 2 * PX);
  const bx = x0 + 232 * PX, bw = w - 232 * PX - 150 * PX, by = y0 + 24 * PX, bh = h - 48 * PX;
  g.fillStyle = 'rgba(255,255,255,.18)'; rr(bx, by, bw, bh, bh / 2); g.fill();
  const fw = Math.max(bh, bw * v / 100);
  if (v > .5) { g.fillStyle = CD.sooty ? '#6b6b70' : gcol(v); rr(bx, by, fw, bh, bh / 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; rr(bx + 6 * PX, by + 5 * PX, Math.max(0, fw - 12 * PX), bh * .3, bh * .15); g.fill(); }
  if (CD.sooty) { g.strokeStyle = '#d8d8dc'; g.lineWidth = 3 * PX; g.beginPath(); [[.2, 0, .26, 1], [.55, 0, .5, .6], [.5, .6, .58, 1], [.82, 0, .86, 1]].forEach(([a, b, c, d]) => { g.moveTo(bx + bw * a, by + bh * b); g.lineTo(bx + bw * c, by + bh * d); }); g.stroke(); }
  // 퍼센트 (값이 오를 때 통통)
  const kick = CD.gauge.some(([a]) => t - a > 0 && t - a < .2) ? 1.2 : 1;
  g.font = `900 ${46 * PX * kick}px "Noto Sans KR"`; g.textAlign = 'right'; g.fillStyle = CD.sooty ? '#d8d8dc' : (v > 1 ? gcol(v) : '#ffffff');
  g.fillText(`${Math.round(v)}%`, x0 + w - 30 * PX, y0 + h / 2 + 3 * PX);
  g.restore();
  TX.push({ id: 'gauge', text: '분노 게이지', x0, y0, x1: x0 + w, y1: y0 + h, pass: true });
  // 펑! 섬광
  if (bt > 0 && bt < 1.2) { g.save(); g.globalAlpha = Math.max(0, .85 - bt / .3); g.fillStyle = '#fff3d0'; g.fillRect(0, 0, W, H); g.restore();
    g.save(); const k = popK(bt); g.translate(W / 2, 560 * PX); g.scale(k, k); g.rotate(-.08); g.font = `900 ${150 * PX}px "Noto Sans KR"`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 16 * PX; g.strokeStyle = '#1b2f5c'; g.globalAlpha = 1 - ss(seg(bt, .9, 1.2)); g.strokeText('펑!', 0, 140 * PX); g.fillStyle = '#ff3b30'; g.fillText('펑!', 0, 140 * PX); g.restore(); }
}
// —— 위에서 떨어지는 큰 숫자 카드 ——
function cardDrop(t) {
  const C = CD.cards || []; const i = C.findLastIndex(c => t >= c.t); if (i < 0 || (CD.boom && t > CD.boom)) return;
  const c = C[i], s = t - c.t, nx = C[i + 1], out = nx ? ss(seg(t, nx.t - .15, nx.t)) : 0;
  const yEnd = 470 * PX, drop = s < .28 ? -(1 - (s / .28) ** 2) * 420 * PX : Math.sin((s - .28) * 18) * Math.exp(-(s - .28) * 7) * -24 * PX;
  const v = gaugeAt(t);
  g.save(); g.globalAlpha = 1 - out; g.translate(W / 2, yEnd + drop + out * 120 * PX); g.rotate(Math.sin(i * 2.3) * .05 * (1 - Math.min(1, s * 2)));
  const font = `900 ${130 * PX}px "Noto Sans KR"`; g.font = font; const tw = g.measureText(c.text).width;
  const cw = Math.max(440 * PX, tw + 100 * PX), ch = 200 * PX;
  g.shadowColor = SH; g.shadowBlur = 26 * PX; g.shadowOffsetY = 10 * PX;
  g.fillStyle = '#ffffff'; rr(-cw / 2, -ch / 2, cw, ch, 30 * PX); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = gcol(v); rr(-cw / 2, -ch / 2, cw, 22 * PX, [30 * PX, 30 * PX, 0, 0]); g.fill();
  g.fillStyle = '#1b2f5c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.text, 0, 12 * PX);
  g.restore();
  if (s > .3) TX.push({ id: 'card' + i, text: c.text, x0: W / 2 - cw / 2, y0: yEnd - ch / 2, x1: W / 2 + cw / 2, y1: yEnd + ch / 2 });
}
function rageTint(t) {
  if (!CD.redden) return; const r = clamp((gaugeAt(t) - 25) / 75); if (r <= 0) return;
  const gr = g.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); gr.addColorStop(0, 'rgba(255,40,30,0)'); gr.addColorStop(1, `rgba(255,30,20,${.28 * r})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function hud(t) {
  g.clearRect(0, 0, W, H); TX = [];
  if (QS.get('nohud')) return;
  rageTint(t);
  if (CD.title && t < CD.title.t1) { g.save(); g.globalAlpha = 1 - ss(seg(t, CD.title.t1 - .3, CD.title.t1)); coverTitle(CD.title, t); g.restore(); }
  if (CD.head && t >= CD.head.t0) boardPanel(CD.head.text, 330 * PX, t, CD.head.t0, 70, 'head');
  if (CD.card) termCard(CD.card, t);
  clockHud(t);
  const sub = (CD.subs || []).find(s => t >= s.t0 && t < s.t1); if (sub) roadSign(sub, t);
  cardDrop(t); gaugeHud(t);
  if (S.hud) S.hud(t, g, { proj, PX, W, H, TX });
  if (QS.get('safe')) { g.save(); g.strokeStyle = 'rgba(255,0,80,.8)'; g.lineWidth = 3; g.setLineDash([14, 10]); g.strokeRect(SAFE.l * PX, SAFE.t * PX, (SAFE.r - SAFE.l) * PX, (SAFE.b - SAFE.t) * PX); g.restore(); }
}

function render(t) {
  S.update(t);          // 배우 먼저 (초점이 한 프레임 늦지 않게)
  setCam(t);
  if (S.light) S.light(t, { sun, hemi });
  const gd = post.grade.uniforms; gd.sat.value = 1.16; gd.contrast.value = .22; gd.warm.value = .25; gd.amt.value = .26; gd.expo.value = S.expo ?? 1;
  { const r = CD.redden ? clamp((gaugeAt(t) - 25) / 75) : 0; gd.tint.value.set(1 + .05 * r, 1 - .09 * r, 1 - .11 * r); }
  post.composer.render();
  hud(t);
}
window.TEXTS = t => { render(t); return TX; };
window.render = render; window.DUR = S.dur; window.EV = S.EV.slice().sort((a, b) => a.t - b.t); window.DBG = { camera, scene, S, post };
render(+(QS.get('t') ?? 1));
window.READY = true;
