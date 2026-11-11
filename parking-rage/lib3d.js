// 틸트시프트용 공통 도구: 매끈한 재질(배우는 부드러운 광택), 기본 도형, 도착 곡선, 글자 텍스처
import * as THREE from 'three';

const MC = new Map();
// 기본 재질: 부드러운 셰이딩, 약간의 광택 (모형 페인트)
export function M(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!o.unique && MC.has(k)) return MC.get(k);
  const { unique, sheen, ...rest } = o;
  const m = sheen ? new THREE.MeshPhysicalMaterial({ color, roughness: .55, metalness: 0, sheen: 1, sheenRoughness: .5, sheenColor: new THREE.Color(color).offsetHSL(0, -.1, .2), ...rest })
    : new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: 0, ...rest });
  if (!unique) MC.set(k, m);
  return m;
}
export const SKIN = c => M(c, { sheen: true });
export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
export const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
export const cyl = (r0, r1, h, seg, c, x, y, z) => mesh(new THREE.CylinderGeometry(r0, r1, h, Math.max(seg, 16)), c, x, y, z);
// 배우용 구: 세분화를 높여 매끈하게, 피부는 광택 재질
export const ico = (r, det, c, x, y, z) => mesh(new THREE.IcosahedronGeometry(r, det + 2), typeof c === 'string' ? SKIN(c) : c, x, y, z);
export const sph = (r, c, x, y, z) => mesh(new THREE.SphereGeometry(r, 24, 16), c, x, y, z);
export function prism(w, h, d, c, x, y, z) {
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
  return mesh(g, c, x, y, z);
}
export const grp = (...ch) => { const g = new THREE.Group(); ch.forEach(c => c && g.add(c)); return g; };

export const pop = (s, k = 6.2, w = 14) => s <= 0 ? 0 : 1 - Math.exp(-k * s) * Math.cos(w * s);

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData = { c, g };
  return t;
}
// 표지판 판: 앞면에 글자
export function signBoard(w, h, lines, o = {}) {
  const px = o.px || 200, cw = Math.round(px * w), ch = Math.round(px * h);
  const tex = canvasTex(cw, ch, g => {
    g.fillStyle = o.bg || '#1f3a68'; g.fillRect(0, 0, cw, ch);
    if (o.border !== false) { g.strokeStyle = o.fg || '#ffffff'; g.lineWidth = ch * .05; g.strokeRect(ch * .06, ch * .06, cw - ch * .12, ch - ch * .12); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const L = Array.isArray(lines) ? lines : [lines];
    L.forEach((l, i) => {
      const fs = (o.fs || [.42, .3])[Math.min(i, 1)] * ch / (L.length > 1 ? 1.1 : .8);
      g.font = `900 ${fs}px "Noto Sans KR"`; g.fillStyle = i === 0 ? (o.fg || '#ffffff') : (o.fg2 || o.fg || '#ffffff');
      g.fillText(l, cw / 2, ch / 2 + (i - (L.length - 1) / 2) * ch * (L.length > 1 ? .4 : 0));
    });
  });
  const edge = M(o.edge || '#c9ced6');
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: .6 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, o.d || .1), [edge, edge, edge, edge, front, edge]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
