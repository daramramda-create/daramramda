// 로우폴리 공통 도구: 평면 셰이딩 재질, 기본 도형, 육각 타일 섬, 도착 곡선, 글자 텍스처
import * as THREE from 'three';
import { clamp, hash } from '/core/lib.js';

const MC = new Map();
export function M(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!o.unique && MC.has(k)) return MC.get(k);
  const { unique, ...rest } = o;
  const m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .9, metalness: 0, ...rest });
  if (!o.unique) MC.set(k, m);
  return m;
}
export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
export const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
export const cyl = (r0, r1, h, seg, c, x, y, z) => mesh(new THREE.CylinderGeometry(r0, r1, h, seg), c, x, y, z);
export const ico = (r, det, c, x, y, z) => mesh(new THREE.IcosahedronGeometry(r, det), c, x, y, z);
export function prism(w, h, d, c, x, y, z) {   // 삼각 지붕 (x 방향으로 긴 용마루)
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
  return mesh(g, c, x, y, z);
}
export const grp = (...ch) => { const g = new THREE.Group(); ch.forEach(c => c && g.add(c)); return g; };

// 육각 타일 (뾰족한 꼭짓점이 위인 기둥): 윗면 캡 + 살짝 가라앉힌 옆 기둥(z-fighting 방지)
const HEX_R = .96;
export function hexTile(h, top, side) {
  const g = new THREE.Group();
  const col = mesh(new THREE.CylinderGeometry(HEX_R, HEX_R, h, 6), side); col.position.y = -h / 2 - .03; g.add(col);
  const cap = mesh(new THREE.CylinderGeometry(HEX_R * .985, HEX_R, .08, 6), top); cap.position.y = -.04; g.add(cap);
  return g;
}
export const axial = (q, r) => [Math.sqrt(3) * (q + r / 2), 1.5 * r];
export function hexRing(n) {   // 반지름 n 안의 모든 축 좌표, 고리 번호 포함
  const out = [];
  for (let q = -n; q <= n; q++) for (let r = Math.max(-n, -q - n); r <= Math.min(n, -q + n); r++) out.push({ q, r, ring: (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 });
  return out;
}
// 떠 있는 섬: 타일 + 아래 바위 뿌리. tiles[i].obj 를 rise() 로 올린다
export function island(n, pal, seed = 1, extra = c => true) {
  const g = new THREE.Group(), tiles = [];
  hexRing(n).filter(extra).forEach(({ q, r, ring }, i) => {
    const [x, z] = axial(q, r), j = (hash(seed * 31 + i * 7.3) - .5) * .08;
    const top = new THREE.Color(pal.top).offsetHSL(0, 0, j).getStyle();
    const t = hexTile(.5, top, pal.side); t.position.set(x, 0, z); g.add(t);
    // 바위 뿌리: 가장자리일수록 짧게
    const dep = (n + 1 - ring) * .9 + hash(i * 3.1 + seed) * .8;
    const root = mesh(new THREE.CylinderGeometry(HEX_R * .9, .25, dep, 6), pal.rock); root.position.set(0, -.55 - dep / 2, 0); t.add(root);
    tiles.push({ obj: t, ring, x, z, i });
  });
  return { g, tiles };
}

// —— 도착 곡선 ——
// 팝: 1 − e^(−k s)·cos(ω s), 약 25% 오버슈트
export const pop = (s, k = 6.2, w = 14) => s <= 0 ? 0 : 1 - Math.exp(-k * s) * Math.cos(w * s);
// 아래에서 솟기: 짧은 큐빅 이즈 업 후 감쇠 사인 오버슈트. 반환값은 y 오프셋 (0 = 제자리)
export function riseY(s, depth = 2, d = .22) {
  if (s <= 0) return -depth - 50;   // 아직 안 보임
  if (s < d) { const u = s / d; return -depth * Math.pow(1 - u, 3); }
  const x = s - d; return Math.sin(x * 16) * Math.exp(-x * 7) * depth * .09;
}
// 떨어져 쌓이기: 빠른 이즈 인 낙하 + 감쇠 바운스 + 부피 보존 스쿼시
export function drop(s, h = 3, d = .25) {
  if (s <= 0) return { y: h + 50, sy: 1 };
  if (s < d) { const u = s / d; return { y: h * (1 - u * u), sy: 1 + .12 * u }; }
  const x = s - d;
  const y = Math.abs(Math.sin(x * 11)) * Math.exp(-x * 9) * h * .06;
  const sy = 1 - .28 * Math.exp(-x * 9) * Math.cos(x * 22);
  return { y, sy };
}
export function applySquash(o, sy, base = 1) { o.scale.set(base / Math.sqrt(sy), base * sy, base / Math.sqrt(sy)); }

// —— 소품에 쓰는 글자 텍스처 ——
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { c, g, draw };
  return t;
}
export function texMat(tex, o = {}) { return new THREE.MeshStandardMaterial({ map: tex, roughness: .95, metalness: 0, ...o }); }
export function labelBoard(w, h, text, o = {}) {
  const px = 256, cw = Math.round(px * w), ch = Math.round(px * h);
  const tex = canvasTex(cw, ch, (g) => {
    g.fillStyle = o.bg || '#fff8ec'; g.fillRect(0, 0, cw, ch);
    g.fillStyle = o.fg || '#5a3a28'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n'), fs = o.fs || ch * .62 / lines.length;
    g.font = `${o.weight || 400} ${fs}px ${o.font || '"Black Han Sans"'}`;
    lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * fs * 1.1));
  });
  const mats = [M(o.edge || '#d9c7ad'), M(o.edge || '#d9c7ad'), M(o.edge || '#d9c7ad'), M(o.edge || '#d9c7ad'), texMat(tex), M(o.edge || '#d9c7ad')];
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, o.d || .08), mats); m.castShadow = true; m.receiveShadow = true;
  return m;
}

// 먼지 고리 (솟거나 떨어질 때): 작은 이코사 조각이 바깥으로 퍼지며 줄어든다
export function puffRing(n = 8, r = .9, c = '#fff5e6') {
  const g = new THREE.Group(), parts = [];
  for (let i = 0; i < n; i++) { const p = ico(.12, 0, c); p.castShadow = false; g.add(p); parts.push(p); }
  g.userData.set = (s) => {   // s: 사건 이후 초
    const on = s > 0 && s < .6; g.visible = on; if (!on) return;
    const u = s / .6;
    parts.forEach((p, i) => { const a = i / n * Math.PI * 2 + .3; const rr = r * (.7 + u * .9); p.position.set(Math.cos(a) * rr, .1 + Math.sin(u * 3) * .15, Math.sin(a) * rr); p.scale.setScalar(Math.max(.001, (1 - u) * 1.2)); });
  };
  g.visible = false; return g;
}
export const clamp01 = clamp;
