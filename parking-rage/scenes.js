// 주차대수 분노 게이지: 컷 4개의 세계·배우·카메라. 단위 = 미터. 각 컷은 t=0부터.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, seg, ss, eio, eo, ei, lerp, mulberry } from '/core/lib.js';
import { M, SKIN, mesh, box, cyl, grp, pop, canvasTex, signBoard } from './lib3d.js';
import { makeSquirrel } from './squirrel.js';
import { building } from './town.js';
import { PROPS } from './story.js';

const env = (t, a, b, fi = .15, fo = .15) => Math.min(ss(seg(t, a, a + fi)), 1 - ss(seg(t, b - fo, b)));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CARC = ['#e8473b', '#f2c230', '#2f7fd8', '#ffffff', '#f4f4f4', '#3a3f48', '#8fd0c8', '#f08c3a', '#c9ced6', '#1f9e5c', '#7a5cd6'];

// —— 차: 둥근 차체. 앞 = +z ——
function makeCar(col, o = {}) {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.9, .8, 3.9, 4, .3), M(col, { roughness: .3, metalness: .15 }), 0, .7, 0));
  if (o.open) {
    g.add(box(1.5, .06, 1.9, '#2b2f36', 0, 1.1, -.35));
    const ws = mesh(new THREE.BoxGeometry(1.7, .5, .05), M('#cfe9f7', { roughness: .05, transparent: true, opacity: .4 }), 0, 1.33, .7); ws.rotation.x = -.45; g.add(ws);
    g.add(box(1.4, .7, .25, '#f2ece2', 0, 1.35, -1.25));
    const wheel = mesh(new THREE.TorusGeometry(.24, .045, 10, 28), M('#22252b', { roughness: .4 }), 0, 1.38, .25); wheel.rotation.x = -1.0; g.add(wheel); g.userData.wheel = wheel;
  } else g.add(mesh(new RoundedBoxGeometry(1.7, .7, 2.1, 4, .25), M('#1b2430', { roughness: .1, metalness: .35 }), 0, 1.3, -.25));
  [[-.92, 1.25], [.92, 1.25], [-.92, -1.25], [.92, -1.25]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(.38, .38, .3, 20), M('#1d1f24'), x, .38, z); w.rotation.z = Math.PI / 2; g.add(w); });
  [-.6, .6].forEach(x => { g.add(mesh(new THREE.SphereGeometry(.13, 12, 8), M('#fffbe6', { emissive: '#fff4c0', emissiveIntensity: o.lights ? 2 : .4 }), x, .78, 1.92)); g.add(box(.36, .14, .05, M('#ff3020', { emissive: '#ff2010', emissiveIntensity: .8 }), x, .82, -1.95)); });
  const sh = mesh(new THREE.PlaneGeometry(2.3, 4.3), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .28, depthWrite: false }), 0, .02, 0); sh.rotation.x = -Math.PI / 2; sh.castShadow = false; g.add(sh);
  return g;
}
// 바닥에 그린 글자 / 벽에 붙은 글자
function paintText(w, h, text, o = {}) {
  const t = canvasTex(Math.round(w * 120), Math.round(h * 120), (g, cw, ch) => {
    g.clearRect(0, 0, cw, ch); g.fillStyle = o.color || '#ffffff'; g.font = `900 ${ch * (o.fs || .8)}px "Noto Sans KR"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + ch * .04);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .9, depthWrite: false })); m.receiveShadow = true; return m;
}

// —— 지하주차장 (천장 없는 단면 모형): 가운데 통로(z 방향), 양쪽 주차칸 ——
function makeGarage(root, o = {}) {
  const R = mulberry(o.seed || 3), L = o.len || 36, G = new THREE.Group(); root.add(G);
  G.add(box(22, .2, L, o.floor || '#a7aeaa', 0, -.1, 0));
  G.add(box(7.0, .01, L, o.aisle || '#959c99', 0, .005, 0));
  const lineM = M('#f7f5ee');
  const stalls = [];
  for (const side of [-1, 1]) {
    for (let z = -L / 2 + 1.2; z <= L / 2 - 1.2; z += 2.7) G.add(mesh(new THREE.BoxGeometry(5.2, .02, .12), lineM, side * 6.2, .02, z));
    for (let z = -L / 2 + 1.2 + 1.35; z < L / 2 - 1.2; z += 2.7) stalls.push({ x: side * 6.2, z, side });
    G.add(box(.3, 3.4, L, o.wall || '#e3e7e3', side * 10.8, 1.7, 0));
    G.add(box(.32, .5, L, o.band || '#2bb673', side * 10.78, 1.1, 0));
    for (let z = -L / 2 + 1.2; z <= L / 2; z += 8.1) {
      G.add(box(.8, 3.4, .8, '#ecebe6', side * 9.3, 1.7, z), box(.84, .7, .84, '#f2c230', side * 9.3, .35, z));
      for (let k = 0; k < 3; k++) { const s = box(.86, .12, .86, '#2b2f36', side * 9.3, .14 + k * .24, z); G.add(s); }
    }
    if (o.level) { const lv = paintText(5, 2.4, o.level, { color: o.levelCol || '#2bb673' }); lv.position.set(side * 10.6, 2.2, -2); lv.rotation.y = -side * Math.PI / 2; G.add(lv); }
  }
  // 통로 바닥 화살표, 형광등 줄
  for (let z = -L / 2 + 4; z < L / 2; z += 9) { const a = paintText(1.6, 2.4, '↑', { fs: .95 }); a.rotation.x = -Math.PI / 2; a.rotation.z = Math.PI; a.position.set(0, .03, z); G.add(a); }
  const lampM = M('#ffffff', { emissive: '#f4fbff', emissiveIntensity: o.lamp ?? 1.6 });
  for (let z = -L / 2 + 3; z < L / 2; z += 6) G.add(mesh(new THREE.BoxGeometry(.18, .08, 2.4), lampM, 0, 3.4, z));
  // 주차된 차
  const parked = [];
  stalls.forEach((s, i) => {
    if ((o.empty || []).some(e => Math.abs(e - s.z) < 1 && Math.sign(o.emptySide ?? s.side) === s.side) || R() > (o.fill ?? .6)) return;
    const c = makeCar(CARC[Math.floor(R() * CARC.length)]); c.position.set(s.x + s.side * .3, 0, s.z); c.rotation.y = s.side > 0 ? Math.PI / 2 : -Math.PI / 2; G.add(c); parked.push(c);
  });
  return { G, stalls, lampM, parked };
}

// 다람쥐 운전석에 앉히기
function driver(car, SC = .9) {
  const sq = makeSquirrel(); sq.root.scale.setScalar(SC); sq.root.position.set(0, .55, -.45); car.add(sq.root); return sq;
}
// 경로: 점 목록을 따라 (위치, 방향)
function pathFn(pts) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'centripetal');
  return u => { u = clamp(u); const p = c.getPointAt(u), d = c.getTangentAt(Math.min(.999, Math.max(.001, u))); return { p, yaw: Math.atan2(d.x, d.z) }; };
}
// 2D 만화 효과 글자 (소리 표시): 들쭉날쭉한 말풍선 + 글자
function burst(g, x, y, text, k, o = {}, PX = 1) {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.scale(k, k); g.rotate(o.rot || -.08);
  const r = (o.r || 120) * PX, n = 14;
  g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r * .72 : r; g.lineTo(Math.cos(a) * rr * 1.35, Math.sin(a) * rr * .8); } g.closePath();
  g.fillStyle = o.bg || '#ffffff'; g.fill(); g.lineWidth = 6 * PX; g.strokeStyle = '#1b2f5c'; g.stroke();
  g.fillStyle = o.fg || '#e8473b'; g.font = `900 ${(o.fs || 56) * PX}px "Noto Sans KR"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 4 * PX);
  if (o.sub) { g.fillStyle = '#1b2f5c'; g.font = `900 ${30 * PX}px "Noto Sans KR"`; g.fillText(o.sub, 0, 50 * PX); }
  g.restore();
}
const bk = (t, t0, t1) => t < t0 || t > t1 ? 0 : Math.max(0, 1 - Math.exp(-(t - t0) * 10) * Math.cos((t - t0) * 16)) * (1 - ss(seg(t, t1 - .15, t1)));

// 줄무늬 텍스처 (노랑/검정 등)
function stripeMat(a, b, n = 8) {
  const t = canvasTex(256, 32, (g) => { for (let k = 0; k < n * 2; k++) { g.fillStyle = k % 2 ? b : a; g.beginPath(); const x = k * 256 / (n * 2); g.moveTo(x, 0); g.lineTo(x + 256 / (n * 2), 0); g.lineTo(x + 256 / (n * 2) - 16, 32); g.lineTo(x - 16, 32); g.closePath(); g.fill(); } });
  return new THREE.MeshStandardMaterial({ map: t, roughness: .6 });
}
const shrub = (x, z, s = 1) => grp(mesh(new THREE.IcosahedronGeometry(.7 * s, 2), M('#4cb54a'), x, .7 * s, z), mesh(new THREE.IcosahedronGeometry(.5 * s, 2), M('#5fc85a'), x + .5 * s, .55 * s, z + .2));
const tree = (x, z, s = 1) => grp(mesh(new THREE.CylinderGeometry(.16 * s, .22 * s, 2.2 * s, 8), M('#6b4a32'), x, 1.1 * s, z), mesh(new THREE.IcosahedronGeometry(1.5 * s, 2), M('#3faa3c'), x, 2.9 * s, z), mesh(new THREE.IcosahedronGeometry(1.0 * s, 2), M('#56c046'), x + .6 * s, 3.5 * s, z - .3));
// 발코니가 있는 아파트 동
function aptTower(R, w, d, h, wall, label, o = {}) {
  const b = building(w, d, h, R, { wall, shop: null }); const fl = Math.floor(h / 3);
  for (let f = 1; f < fl; f++) { b.add(box(w * .92, .14, .9, '#f7f4ee', 0, f * 3 + .1, d / 2 + .45)); const rl = mesh(new THREE.BoxGeometry(w * .92, .75, .05), M('#bfe0f0', { transparent: true, opacity: .45, roughness: .1 }), 0, f * 3 + .55, d / 2 + .88); rl.castShadow = false; b.add(rl);
    if (o.laundry && R() < .45) for (let k = 0; k < 3; k++) b.add(box(.5, .6, .04, ['#f2796b', '#2f7fd8', '#ffffff', '#f2c230'][Math.floor(R() * 4)], (R() - .5) * w * .8, f * 3 + .5, d / 2 + .8));
    if (o.ac && R() < .5) b.add(box(.8, .55, .45, '#e8e8e4', (R() - .5) * w * .8, f * 3 + 1.6, d / 2 + .25)); }
  if (o.tank) b.add(cyl(1.2, 1.2, 1.8, 20, '#4f8fc0', w * .25, h + 1.1, 0));
  if (label) { const s = signBoard(5, 1.8, label, { bg: '#ffffff', fg: '#1b2f5c', fs: [.6], border: false, d: .2, px: 60 }); s.position.set(0, h - 1.6, d / 2 + 1.0); b.add(s); }
  return b;
}

// ———————————————— 컷 1: 아파트 지하주차장 입구, 선글라스 다람쥐 ————————————————
function cut1(scene) {
  const R = mulberry(4), W = new THREE.Group(); scene.add(W); const EV = [];
  W.add(box(160, .2, 160, '#dcd7cc', 0, -.1, 0));
  // 단지 안 도로 (x 방향, z = 6) + 보도 + 경계석
  W.add(box(90, .02, 8, '#4f535a', 5, .01, 6));
  for (let x = -38; x < 50; x += 5) W.add(box(2.4, .02, .18, '#f2c230', x, .03, 6));
  [10.6, 1.4].forEach(z => { W.add(box(90, .16, 2.2, '#cfc9bc', 5, .08, z)); });
  // 지하주차장 입구 (북쪽, 입구가 도로 쪽 +z를 향함)
  const gate = new THREE.Group(); gate.position.set(0, 0, -1.2); W.add(gate);
  const stone = M('#cdbfa8', { roughness: .9 });
  gate.add(mesh(new THREE.BoxGeometry(.8, 3.6, 11), stone, -4.7, 1.8, -5), mesh(new THREE.BoxGeometry(.8, 3.6, 11), stone, 4.7, 1.8, -5));
  gate.add(box(11, .5, 7, '#f1ece3', 0, 3.85, -3.2));                                     // 캐노피 지붕
  const fascia = box(11, 1.3, .45, '#1b2f5c', 0, 3.55, .3); gate.add(fascia);
  const gs = signBoard(8.4, 1.0, PROPS.gate + ' ' + PROPS.ent, { bg: '#1b2f5c', fg: '#ffffff', fs: [.66], border: false, d: .1, px: 70 }); gs.position.set(0, 3.55, .58); gate.add(gs);
  for (let k = -3; k <= 3; k++) gate.add(mesh(new THREE.BoxGeometry(.9, .06, .2), M('#ffffff', { emissive: '#fff6d8', emissiveIntensity: 2.2 }), k * 1.3, 3.58, -1.0));   // 천장 조명
  const ramp = box(8.6, .25, 15, '#3d4148', 0, -1.75, -8); ramp.rotation.x = -.24; gate.add(ramp);
  for (let k = 0; k < 6; k++) { const ln = box(.15, .02, 1.6, '#f2c230', 0, -.05 - k * .62, -1.2 - k * 2.6); ln.rotation.x = -.24; gate.add(ln); }
  gate.add(box(8.6, 5, .3, '#0b0d11', 0, -2.2, -14.5), box(8.6, .3, 8, '#0b0d11', 0, 1.2, -10));   // 어두운 안쪽
  // 높이제한 바 (노랑/검정 줄무늬) + 표지
  const hb = mesh(new THREE.BoxGeometry(8.8, .34, .3), stripeMat('#f2c230', '#1d1f24', 10), 0, 2.55, .9); gate.add(hb);
  gate.add(box(.06, .7, .06, '#555', -3.6, 2.95, .9), box(.06, .7, .06, '#555', 3.6, 2.95, .9));
  const hl = signBoard(2.6, .62, PROPS.limit, { bg: '#ffffff', fg: '#e8473b', fs: [.55], border: false, d: .06, px: 90 }); hl.position.set(0, 2.05, .95); gate.add(hl);
  // 차단기 + 경비 부스 + 입차 가능 전광판
  const booth = grp(box(1.6, 2.4, 1.6, '#f4f1ea', 0, 1.2, 0), box(1.62, .5, 1.62, '#1b2f5c', 0, 2.55, 0), mesh(new THREE.BoxGeometry(1.2, .8, .05), M('#1b2430', { roughness: .1 }), 0, 1.5, .81)); booth.position.set(6.6, 0, 1.8); W.add(booth);
  const armPivot = new THREE.Group(); armPivot.position.set(5.4, 1.05, 2.7); W.add(armPivot);
  armPivot.add(box(.4, 1.1, .4, '#e8e4dc', 0, -.5, 0)); const arm = mesh(new THREE.BoxGeometry(5.2, .14, .14), stripeMat('#e8473b', '#ffffff', 7), -2.6, .1, 0); armPivot.add(arm);
  const led = signBoard(1.6, .55, PROPS.inOk, { bg: '#111', fg: '#3cf06e', fs: [.6], border: false, d: .1, px: 100 }); led.position.set(6.6, 3.2, 2.65); W.add(led);
  // 과속방지턱, 바닥 글씨/화살표
  const bump = mesh(new THREE.BoxGeometry(8.4, .12, .7), stripeMat('#f2c230', '#1d1f24', 8), 0, .06, 3.1); bump.rotation.y = Math.PI / 2 * 0; W.add(bump);
  const pt = paintText(4.6, 1.1, PROPS.gate, { fs: .8 }); pt.rotation.x = -Math.PI / 2; pt.position.set(0, .04, 4.4); W.add(pt);
  const ar = paintText(1.2, 1.8, '↑', { fs: .95 }); ar.rotation.x = -Math.PI / 2; ar.position.set(-2.2, .04, 4.6); W.add(ar);
  // 화단, 입주민 전용 표지, 가로수, 가로등
  [[-7.2, -.2], [-7.2, -4.5], [8.6, -1.6]].forEach(([x, z]) => { W.add(box(2.4, .6, 3.4, '#b4ada2', x, .3, z)); W.add(shrub(x - .4, z, 1)); W.add(shrub(x + .5, z + .9, .8)); });
  const rs = grp(cyl(.06, .06, 1.6, 12, '#6b7480', 0, .8, 0)); const rsb = signBoard(1.8, .6, PROPS.resident, { bg: '#2bb673', fg: '#ffffff', fs: [.6], border: false, d: .06, px: 90 }); rsb.position.y = 1.8; rs.add(rsb); rs.position.set(-6.4, 0, 2.6); W.add(rs);
  for (let x = -30; x <= 40; x += 9) { if (Math.abs(x) < 8) continue; W.add(tree(x, 11.6, .9)); }
  for (let x = -26; x <= 36; x += 14) W.add(grp(cyl(.08, .1, 4.2, 10, '#5a6068', x, 2.1, 0.3), mesh(new THREE.SphereGeometry(.28, 12, 8), M('#fff6d8', { emissive: '#fff0c0', emissiveIntensity: .8 }), x, 4.3, .3)));
  // 아파트 동 (발코니, 에어컨)
  [[-20, -24, '#f4efe6', PROPS.apt], [2, -32, '#eef1f6', PROPS.apt2], [24, -24, '#f6ece0', PROPS.apt3]].forEach(([x, z, wall, lab]) => { const b = aptTower(R, 15, 10, 39, wall, lab, { ac: true }); b.position.set(x, 0, z); W.add(b); });
  // 단지 조경 (뒤쪽)
  for (let k = 0; k < 12; k++) W.add(tree(-30 + k * 5.5 + R() * 2, -14 - R() * 4, .8 + R() * .3));
  // 주인공 차: 도로를 따라 와서 입구로 우회전
  const car = makeCar('#ff8fa3', { open: true, lights: true }); W.add(car);
  const sq = driver(car); sq.glasses.visible = true;
  const path = pathFn([[8, 0, 6], [4.5, 0, 6], [1.8, 0, 4.9], [.4, 0, 2.2], [0, -.5, -1.5], [0, -1.6, -6]]);
  const U = t => seg(t, 0, 6.2) * .9;
  EV.push({ t: .2, type: 'engine' }, { t: 2.6, type: 'barrier' }, { t: 0, type: 'amb', what: 'outdoor', d: 5 });
  return {
    W, EV, dur: 5, sky: ['#9fe3cf', '#e6f8f1'],
    cam(t) { const P = path(U(t)).p, u = ss(seg(t, 0, 5));
      const pos = [lerp(-7.5, -6.5, u), lerp(16, 15, u), lerp(29, 27, u)], look = [lerp(2.6, 1.2, u), 1.0, lerp(1.6, .6, u)];
      return { pos, look, fov: 32, near: .5, far: 800, focus: V(...pos).distanceTo(V(P.x, 1.5, P.z)), aper: 26, maxCoc: 22, band: { at: [P.x, 1.6, P.z], w: .14, amp: 24, mix: .6 } }; },
    sun: t => ({ az: 200, el: 52, target: [2, 0, 0], span: 26 }),
    light(t, { sun, hemi }) { sun.intensity = 3.0; hemi.intensity = 1.1; },
    update(t) {
      const P = path(U(t)); car.position.copy(P.p); car.rotation.y = P.yaw; car.rotation.x = P.p.y < -.05 ? .22 : 0;
      armPivot.rotation.z = -ss(seg(t, 2.6, 3.2)) * 1.4;
      const bob = Math.sin(t * 9) * .02 * (t > .3 ? 1 : 0);
      sq.pose({ armL: [1.25, .25 + Math.sin(t * 3) * .06], armR: [1.25, .25 - Math.sin(t * 3) * .06], mouth: .8, headTilt: Math.sin(t * 2.2) * .12, headTurn: .55 + Math.sin(t * 1.4) * .1, jump: bob, tailSway: Math.sin(t * 3) * .1, lean: -.1 });
    },
  };
}

// ———————————————— 컷 2: 평화 구간 (B1 → B2) ————————————————
function cut2(scene) {
  const W = new THREE.Group(); scene.add(W); const EV = [];
  const gar = makeGarage(W, { len: 40, fill: .32, seed: 5, level: PROPS.b1, empty: [-1.35, 1.35, 4.05] , emptySide: -1 });
  // 비뚤게 댄 옆 차 (선 두 칸 차지)
  const crook = makeCar('#e8473b'); crook.position.set(-6.0, 0, -2.4); crook.rotation.y = -Math.PI / 2 + .55; W.add(crook);
  // B2 내려가는 경사로 (통로 끝)
  const ramp = box(7, .2, 14, '#7f8682', 0, -1.7, -26.5); ramp.rotation.x = .24; W.add(ramp);
  const b2 = signBoard(4.2, 1.4, PROPS.b2, { bg: '#f2c230', fg: '#1b2f5c', fs: [.62], border: false, d: .2, px: 60 }); b2.position.set(-3.8, 2.6, -18.5); b2.rotation.y = Math.PI * .8; W.add(b2);
  const car = makeCar('#ff8fa3', { open: true, lights: true }); W.add(car);
  const sq = driver(car); sq.glasses.visible = true;
  const pA = pathFn([[0, 0, 12], [0, 0, 5], [-1.5, 0, 1.5], [-5.6, 0, 1.3]]);
  const pB = pathFn([[0, 0, 8], [0, 0, -6], [0, 0, -17], [0, -1.2, -23], [0, -2.6, -29]]);
  const shot = t => t < 3.5 ? 'A' : 'B';
  EV.push({ t: .35, type: 'moktak' }, { t: 1.3, type: 'stop' }, { t: 3.4, type: 'blip', n: 0 }, { t: 4.2, type: 'okay' }, { t: 6.9, type: 'blip', n: 1 }, { t: 0, type: 'amb', what: 'garage', d: 7 });
  [.1, 3.5].forEach(t => EV.push({ t, type: 'card' }));
  const carAt = t => { const s = shot(t); if (s === 'A') { const u = eo(seg(t, 0, 1.35)); return pA(u); } return pB(seg(t, 3.5, 7.4)); };
  return {
    W, EV, dur: 7, sky: ['#cfd8d4', '#e9efec'],
    shot,
    cam(t) {
      const s = shot(t), P = carAt(t).p;
      if (s === 'A') return { pos: [-12.5, 7.5, 5.5], look: [-5.2, .7, -.4], fov: 36, near: .5, far: 300, focus: V(-12.5, 7.5, 5.5).distanceTo(V(-5.5, 1.4, 1)), aper: 24, maxCoc: 22, band: { at: [P.x, 1.6, P.z], w: .12, amp: 22, mix: .6 } };
      const pos = [P.x + 4.2, P.y + 6.3, P.z - 8.5]; return { pos, look: [P.x, P.y + 1.1, P.z - .5], fov: 34, near: .5, far: 300, focus: V(...pos).distanceTo(P), aper: 24, maxCoc: 22, band: { at: [P.x, P.y + 1.6, P.z], w: .12, amp: 22, mix: .6 } };
    },
    sun: t => ({ az: 30, el: 70, target: [0, 0, carAt(t).p.z], span: 18 }),
    light(t, { sun, hemi }) { sun.intensity = 1.6; hemi.intensity = 1.5; },
    update(t) {
      const s = shot(t), P = carAt(t); car.position.copy(P.p); car.rotation.y = P.yaw; car.rotation.x = s === 'B' && P.p.y < -.05 ? .2 : 0;
      const tt = t, zen = s === 'A', lucky = s === 'B', pout = false;
      const v = lucky ? env(t, 4.0, 6.4, .2, .25) : 0, wig = Math.sin(t * 10) * .1 * v;   // 낫배드: 손 한 번 까딱
      sq.glasses.visible = !zen || t < .2;   // 해탈: 눈 감은 얼굴이 보이게 선글라스를 이마로
      sq.pose({
        armL: [1.25, .25], armR: lucky ? [lerp(1.25, 1.0, v), lerp(.25, 1.5, v) + wig] : [1.25, .25],
        mouth: zen ? .7 : 1.0, brow: lucky ? -.25 * v : 0,
        headTilt: zen ? .1 + Math.sin(tt * 1.5) * .05 : .18 * v + Math.sin(tt * 3) * .05, headNod: zen ? -.08 : -.05 * v, headTurn: lucky ? .25 : 0, lid: zen ? ss(seg(t, .2, .5)) : .25,
        jump: 0, tailSway: Math.sin(t * 3) * .1, ear: 0,
      });
      if (zen) { sq.glasses.position.set(0, .62, -.12); sq.glasses.rotation.x = -.35; sq.glasses.visible = true; } else { sq.glasses.position.set(0, 0, 0); sq.glasses.rotation.x = 0; }
    },
  };
}

// 조연 동물 (곰, 토끼): 차 미는 자세
const ellM = (rx, ry, rz, c, x = 0, y = 0, z = 0) => { const m = mesh(new THREE.SphereGeometry(1, 32, 22), typeof c === 'string' ? SKIN(c) : c, x, y, z); m.scale.set(rx, ry, rz); return m; };
function makeAnimal(kind) {
  const C = kind === 'bear' ? { f: '#9a6a3e', m: '#e8cfae', e: '#7a522e' } : { f: '#f2f0ec', m: '#ffffff', e: '#f4b6c2' };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(ellM(.5, .55, .44, C.f, 0, .62, 0), ellM(.32, .36, .2, C.m, 0, .58, .28));
  [-1, 1].forEach(s => body.add(ellM(.17, .08, .23, C.e === '#f4b6c2' ? C.f : C.e, s * .25, .08, .12)));
  const head = new THREE.Group(); head.position.set(0, 1.42, .05); body.add(head);
  head.add(ellM(.47, .41, .41, C.f), ellM(.2, .14, .12, C.m, 0, -.11, .35), ellM(.065, .045, .04, '#2b2b2b', 0, -.05, .46));
  [-1, 1].forEach(s => { head.add(ellM(.05, .065, .03, '#222', s * .16, .07, .37));
    if (kind === 'bear') { head.add(ellM(.13, .13, .07, C.f, s * .32, .31, -.02), ellM(.07, .07, .04, C.e, s * .32, .31, .03)); }
    else { const e = new THREE.Group(); e.position.set(s * .16, .38, -.02); e.rotation.z = -s * .15; e.add(ellM(.09, .4, .07, C.f, 0, .3, 0), ellM(.05, .3, .04, C.e, 0, .3, .04)); head.add(e); }
    const b = box(.16, .04, .04, '#3a2a20', s * .16, .2, .37); b.rotation.z = -s * .4; head.add(b); });
  const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * .38, .95, .12); body.add(sh); sh.add(ellM(.1, .26, .1, C.f, 0, -.2, 0)); return sh; });
  const sweat = ellM(.05, .07, .04, '#bfe3f5', .45, .2, .3); sweat.castShadow = false; head.add(sweat);
  return { root, body, head, arms, sweat };
}

// ———————————————— 컷 3: 분노 구간 (B5 → 지상 이중주차 → 새벽 6시) ————————————————
function cut3(scene) {
  const W = new THREE.Group(); scene.add(W); const EV = [];
  // A: B5 (어두움, 꽉 참)
  const A = new THREE.Group(); W.add(A);
  const gar = makeGarage(A, { len: 40, fill: 1, seed: 9, level: PROPS.b5, levelCol: '#e8473b', floor: '#7d847f', aisle: '#6f7571', wall: '#b9bdb9', band: '#e8473b', lamp: .5 });
  const carA = makeCar('#ff8fa3', { open: true, lights: true }); carA.position.set(0, 0, 0); carA.rotation.y = Math.PI; A.add(carA);
  const sqA = makeSquirrel(); sqA.root.scale.setScalar(.72); sqA.root.position.set(1.9, 0, 2.2); A.add(sqA.root);
  const flash = grp(cyl(.07, .09, .5, 12, '#2b2f36', 0, 0, 0), mesh(new THREE.SphereGeometry(.09, 12, 8), M('#fffbe0', { emissive: '#fff4b0', emissiveIntensity: 3 }), 0, .26, 0));
  sqA.arms[1].a.add(flash); flash.position.set(0, -.36, .15); flash.rotation.x = -1.2;
  const spot = new THREE.SpotLight('#fff2c4', 400, 22, .38, .45, 1.2); spot.castShadow = false; A.add(spot, spot.target);
  const beam = mesh(new THREE.ConeGeometry(1.6, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); beam.castShadow = false; A.add(beam);
  // B: 구축 지상주차장 (이중주차)
  const B = new THREE.Group(); B.position.set(200, 0, 0); W.add(B);
  const R = mulberry(21);
  B.add(box(70, .2, 60, '#5b5f66', 0, -.1, 0));
  [[-14, -18], [14, -18]].forEach(([x, z], i) => { const b = aptTower(R, 26, 11, 15, i ? '#e2cfb2' : '#e6d4b8', i ? PROPS.apt2 : PROPS.apt, { laundry: true, ac: true, tank: true }); b.position.set(x, 0, z); B.add(b);
    const big = paintText(6, 3, i ? '102' : '101', { color: '#8a6a4a', fs: .9 }); big.position.set(i ? 13.05 : -13.05, 10, 0); big.rotation.y = i ? Math.PI / 2 : -Math.PI / 2; b.add(big); });
  for (let x = -30; x <= 30; x += 6) B.add(tree(x, -11.5, .8));
  B.add(box(60, .5, .6, '#b4ada2', 0, .25, -11.2));   // 낮은 담
  for (let x = -28; x <= 28; x += 1.2) B.add(box(.08, 1.0, .08, '#6b7480', x, .7, -11.0));
  for (let x = -24; x <= 24; x += 2.7) { B.add(box(.12, .02, 5.2, '#f2f0e8', x, .02, -8.5)); B.add(box(.12, .02, 5.2, '#f2f0e8', x, .02, 4)); }
  const parkedB = [];
  for (let x = -22.6; x <= 22.6; x += 2.7) { [[-8.5, 0], [4, Math.PI]].forEach(([z, ry]) => { const c = makeCar(CARC[Math.floor(R() * CARC.length)]); c.position.set(x, 0, z); c.rotation.y = ry; B.add(c); }); }
  for (let x = -20; x <= 20; x += 4.3) { if (x > -2 && x < 5) continue; const c = makeCar(CARC[Math.floor(R() * CARC.length)]); c.position.set(x, 0, -2.3); c.rotation.y = Math.PI / 2; B.add(c); parkedB.push(c); }   // 이중주차 줄
  const pushCar = makeCar('#ff8fa3', { open: true }); pushCar.rotation.y = Math.PI / 2; B.add(pushCar);
  const helpers = [['bear', -1.4, '#2f7fd8'], ['rabbit', 3.7, '#1f9e5c']].map(([k, x, col]) => { const c = makeCar(col); c.position.set(x, 0, -5.3); c.rotation.y = Math.PI / 2; B.add(c); const a = makeAnimal(k); a.root.scale.setScalar(.95); B.add(a.root); return { a, c, x0: x }; });
  const sqB = makeSquirrel(); sqB.root.scale.setScalar(.72); B.add(sqB.root);
  // C: 새벽 6시 침실
  const C = new THREE.Group(); C.position.set(-200, 0, 0); W.add(C);
  C.add(box(9, .2, 9, '#d9b48a', 0, -.1, 0), box(9, 4.5, .2, '#e6dcf2', 0, 2.25, -4.5), box(.2, 4.5, 9, '#efe6f6', -4.5, 2.25, 0));
  const winTex = canvasTex(64, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#5a4f9c'); gr.addColorStop(.6, '#e88aa0'); gr.addColorStop(1, '#ffc58a'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.0), new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false })); win.position.set(1.2, 2.6, -4.38); C.add(win);
  C.add(box(2.4, .12, .12, '#ffffff', 1.2, 3.62, -4.35), box(2.4, .12, .12, '#ffffff', 1.2, 1.58, -4.35), box(.12, 2.1, .12, '#ffffff', 1.2, 2.6, -4.33));
  const bed = grp(box(2.6, .45, 3.6, '#a8784e', 0, .225, 0), box(2.4, .3, 3.4, '#ffffff', 0, .6, 0), box(2.6, 1.2, .2, '#a8784e', 0, .6, -1.85), mesh(new RoundedBoxGeometry(1.4, .25, .7, 3, .1), M('#ffffff'), 0, .85, -1.25));
  bed.position.set(-1.6, 0, -1.6); C.add(bed);
  const blanket = mesh(new RoundedBoxGeometry(2.5, .35, 2.4, 3, .15), M('#9fd8c6'), -1.6, .85, -.3); C.add(blanket);
  const stand = grp(box(.9, .9, .8, '#c49a6c', 0, .45, 0)); stand.position.set(.5, 0, -3.3); C.add(stand);
  const clockTex = canvasTex(256, 110, (g) => { g.fillStyle = '#1d1f24'; g.fillRect(0, 0, 256, 110); g.fillStyle = '#ff5040'; g.font = '600 86px "Overpass Mono"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(PROPS.clock, 128, 60); });
  const clk = new THREE.Mesh(new THREE.BoxGeometry(.6, .26, .2), [M('#2b2f36'), M('#2b2f36'), M('#2b2f36'), M('#2b2f36'), new THREE.MeshBasicMaterial({ map: clockTex, toneMapped: false }), M('#2b2f36')]); clk.position.set(.65, 1.04, -3.15); C.add(clk);
  const phTex = canvasTex(120, 220, (g) => { g.fillStyle = '#2f7fd8'; g.fillRect(0, 0, 120, 220); g.fillStyle = '#fff'; g.font = '900 26px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('📞', 60, 70); g.font = '900 20px "Noto Sans KR"'; g.fillText('차 빼주세요', 60, 130); });
  const phone = new THREE.Mesh(new THREE.BoxGeometry(.22, .03, .4), [M('#111'), M('#111'), new THREE.MeshBasicMaterial({ map: phTex, toneMapped: false }), M('#111'), M('#111'), M('#111')]); phone.position.set(.3, .93, -3.2); C.add(phone);
  const sqC = makeSquirrel(); sqC.root.scale.setScalar(.62); C.add(sqC.root);
  // 화염 폭발: 불덩이(가산 혼합 4단계 색) + 불꽃 튀김 + 검은 연기 + 침대 위 남은 불길 + 주황 조명
  const FR = mulberry(77), SPH = new THREE.SphereGeometry(1, 18, 12);
  const fireM = ['#fff2b0', '#ffb22e', '#f0601a', '#a8300e'].map((c, i) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: [.75, .6, .45, .3][i], depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const BOOM = V(-1.4, 1.1, -1.6), fire = [], sparks = [], smoke = [];
  for (let i = 0; i < 70; i++) { const d = V(FR() - .5, FR() * .9 + .1, FR() - .5).normalize(); const m = new THREE.Mesh(SPH, fireM[0]); m.castShadow = false; m.visible = false; m.userData = { d, sp: .9 + FR() * 1.6, sz: .14 + FR() * .26, life: .7 + FR() * .7 }; C.add(m); fire.push(m); }
  const sparkM = new THREE.MeshBasicMaterial({ color: '#ffe6a0', toneMapped: false });
  for (let i = 0; i < 40; i++) { const d = V(FR() - .5, FR() * .8 + .2, FR() - .5).normalize(); const m = new THREE.Mesh(SPH, sparkM); m.scale.setScalar(.03); m.castShadow = false; m.visible = false; m.userData = { d, sp: 4 + FR() * 4 }; C.add(m); sparks.push(m); }
  const smM = new THREE.MeshStandardMaterial({ color: '#221f1f', transparent: true, opacity: .88, roughness: 1, depthWrite: false });
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(SPH, smM); m.castShadow = false; m.visible = false; m.userData = { x: (FR() - .5) * 2.6, z: (FR() - .5) * 2.2, d: FR() * .5, sz: .5 + FR() * .6 }; C.add(m); smoke.push(m); }
  const flames = []; const flM = [new THREE.MeshBasicMaterial({ color: '#ffb02e', transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), new THREE.MeshBasicMaterial({ color: '#ff5a14', transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(.22, .9, 12), flM[i % 2]); m.castShadow = false; m.visible = false; m.userData = { x: -2.5 + (i % 5) * .45, z: -1.0 + Math.floor(i / 5) * .9, ph: FR() * 6 }; C.add(m); flames.push(m); }
  const fireL = new THREE.PointLight('#ff7a2a', 0, 14, 1.5); fireL.position.copy(BOOM); C.add(fireL);
  const shot = t => t < 3.1 ? 'A' : t < 6.6 ? 'B' : 'C';
  EV.push({ t: .1, type: 'card' }, { t: 3.1, type: 'card' }, { t: 6.6, type: 'card' }, { t: .9, type: 'sigh' }, { t: 2.9, type: 'blip', n: 3 }, { t: 3.9, type: 'honk' }, { t: 4.6, type: 'honk' }, { t: 6.4, type: 'blip', n: 4 },
    { t: 7.1, type: 'ring', d: 2.8 }, { t: 7.7, type: 'gasp' }, { t: 9.8, type: 'blip', n: 5 }, { t: 10.0, type: 'boom' }, { t: 0, type: 'amb', what: 'dungeon', d: 3.1 }, { t: 3.1, type: 'amb', what: 'outdoor', d: 3.5 }, { t: 6.6, type: 'amb', what: 'room', d: 5.4 });
  const sit = t => ss(seg(t, 7.65, 7.9));
  return {
    W, EV, dur: 12, sky: ['#2a2f3a', '#3e4552'], shot,
    cam(t) {
      const s = shot(t), sh = t > 10 ? Math.exp(-(t - 10) * 3) * .25 : 0, j = [Math.sin(t * 53) * sh, Math.cos(t * 41) * sh, 0];
      if (s === 'A') { const u = ss(seg(t, 0, 3.1)); const pos = [lerp(6, 5, u), lerp(6, 5.2, u), lerp(9, 8, u)]; return { pos, look: [1.4, .25, .9], fov: 38, near: .3, far: 300, focus: V(...pos).distanceTo(V(1.9, 1.2, 2.2)), aper: 22, maxCoc: 22, band: { at: [1.9, 1.2, 2.2], w: .13, amp: 22, mix: .6 } }; }
      if (s === 'B') { const u = ss(seg(t, 3.1, 6.6)); const CV = +(new URLSearchParams(location.search).get('cv') || 2); const pos = CV === 1 ? [200 - 11, lerp(7.5, 7, u), lerp(9, 8.5, u)] : CV === 2 ? [200 + 9, lerp(8, 7.5, u), lerp(10, 9.5, u)] : [200 + lerp(1.5, 1, u), lerp(16, 15, u), lerp(19, 18, u)]; return { pos, look: CV === 1 ? [200 - 1.2, 1.0, -3.2] : CV === 2 ? [200 - .3, 1.0, -3.2] : [200 + .4, .8, -3.6], fov: 34, near: .5, far: 400, focus: V(...pos).distanceTo(V(201.5, 1, -2.3)), aper: 30, maxCoc: 24, band: { at: [199.2, 1.2, -1.6], w: .13, amp: 24, mix: .6 } }; }
      const u = ss(seg(t, 6.6, 12)); const pos = [-200 + lerp(3.2, 2.8, u) + j[0], lerp(5.5, 5.1, u) + j[1], lerp(4.6, 4.2, u)];
      return { pos, look: [-200 - 1.0, .9, -1.6], fov: 40, near: .3, far: 200, focus: V(...pos).distanceTo(V(-201.6, 1, -1.6)), aper: 16, maxCoc: 20, band: { at: [-201.6, 1.1, -1.7], w: .14, amp: 20, mix: .6 } };
    },
    sun: t => { const s = shot(t); return s === 'A' ? { az: 30, el: 70, target: [0, 0, 0], span: 16 } : s === 'B' ? { az: 210, el: 30, target: [200, 0, -2], span: 30 } : { az: 120, el: 25, target: [-200, 0, -2], span: 8 }; },
    light(t, { sun, hemi }) { const s = shot(t); if (s === 'A') { sun.intensity = .25; hemi.intensity = .35; hemi.color.set('#9fb4ff'); } else if (s === 'B') { sun.intensity = 2.6; hemi.intensity = 1.0; hemi.color.set('#cfe3ff'); sun.color.set('#ffe2c0'); } else { sun.intensity = 1.6; sun.color.set('#ffb08a'); hemi.intensity = .8; hemi.color.set('#b9a8ff'); } },
    update(t) {
      const s = shot(t); A.visible = s === 'A'; B.visible = s === 'B'; C.visible = s === 'C';
      // A: 손전등 휘두르며 동공지진
      const sw = Math.sin(t * 2.6) * .5;
      sqA.pose({ armR: [1.35 + Math.sin(t * 3.1) * .15, .3 + sw * .4], armL: [.9, .2], eyeShake: Math.sin(t * 47) * .045, eye: 1.25, brow: -.6, mouth: .6 + .2 * Math.abs(Math.sin(t * 9)), sweat: (t * 1.4) % 1, ear: .9, headTurn: sw * .3, tailPuff: .9, lean: .05 });
      sqA.root.rotation.y = .5 + sw * .2;
      flash.updateMatrixWorld(true); const fp = new THREE.Vector3(), fd = new THREE.Vector3(0, 1, 0); flash.getWorldPosition(fp); fd.applyQuaternion(flash.getWorldQuaternion(new THREE.Quaternion())).normalize();
      A.worldToLocal(fp); spot.position.copy(fp); spot.target.position.copy(fp.clone().addScaledVector(fd, 8)); spot.intensity = s === 'A' ? 400 : 0;
      beam.position.copy(fp.clone().addScaledVector(fd, 3.5)); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), fd); beam.visible = s === 'A';
      gar.lampM.emissiveIntensity = .4 + (Math.sin(t * 23) > .7 ? .4 : 0);
      // B: 이중주차 차 밀기
      // 영차 리듬: 뒤로 젖힘(wind) → 밀기(shove, 차가 조금 움직임) → 헐떡임. 고주파 떨림 없음.
      const heave = (t0, n, per, dists) => { let x = 0, wind = 0, shove = 0, rock = 0, rest = 0;
        for (let i = 0; i < n; i++) { const p = (t - t0 - i * per) / per; if (p < 0) break;
          if (p >= 1) { x += dists[i]; continue; }
          const m = ss(seg(p, .3, .62)); x += dists[i] * (1 - Math.pow(1 - m, 2.2));
          wind = Math.sin(seg(p, 0, .3) * Math.PI) * (p < .3 ? 1 : 0); shove = Math.sin(seg(p, .26, .7) * Math.PI);
          const q = Math.max(0, p - .62); rock = p > .62 ? Math.exp(-q * 9) * Math.sin(q * 26) : -shove * .6; rest = seg(p, .7, 1); }
        return { x, wind, shove, rock, rest }; };
      const hv = heave(3.5, 3, 1.0, [.16, .3, .52]);
      pushCar.rotation.order = 'YXZ'; pushCar.position.set(.3 + hv.x, 0, -2.3); pushCar.rotation.x = hv.rock * .035;
      sqB.root.position.set(pushCar.position.x - 2.6 - hv.wind * .14 + hv.shove * .05, 0, -1.6); sqB.root.rotation.y = Math.PI / 2 - .55;
      sqB.pose({ armL: [1.55 - hv.wind * .35, .05], armR: [1.55 - hv.wind * .35, .05], lean: .34 - hv.wind * .2 + hv.shove * .24, brow: .8, eye: .9 - hv.shove * .5, lid: .3 + hv.shove * .5, mouth: .35 + hv.shove * .5 + hv.rest * .25 * Math.abs(Math.sin(t * 7)), sweat: (t * 1.6) % 1, squash: .95 - hv.wind * .05 + hv.shove * .04 + hv.rest * .025 * Math.sin(t * 7), ear: .6 - hv.shove * .3, tailPuff: 1.1, headNod: .1 + hv.shove * .25 });
      helpers.forEach(({ a, c, x0 }, i) => { const h = heave(3.72 + i * .27, 3, 1.0, [.12, .22, .4]); c.rotation.order = 'YXZ'; c.position.x = x0 + h.x; c.rotation.x = h.rock * .03; a.root.position.set(c.position.x - 2.55 - h.wind * .12 + h.shove * .04, 0, -4.6); a.root.rotation.y = Math.PI / 2 - .5;
        a.body.rotation.x = .32 - h.wind * .2 + h.shove * .22 + h.rest * .03 * Math.sin(t * 7 + i); a.arms.forEach(sh => sh.rotation.x = -1.5 + h.wind * .35); a.sweat.position.y = .2 - ((t * 1.5 + i * .5) % 1) * .2; });
      // C: 침대 → 벌떡 → 펑
      const up = sit(t), boom = t > 10, sootK = ss(seg(t, 10, 10.15));
      sqC.root.position.set(-1.6, lerp(.7, .55, up) + (t > 7.65 && t < 8.1 ? Math.sin((t - 7.65) / .45 * Math.PI) * .5 : 0), lerp(-1.35, -1.0, up));
      sqC.root.rotation.x = lerp(-1.32, 0, up);
      const ring = t > 7.1 && t < 9.9;
      sqC.pose({ lid: up > .5 ? 0 : 1, eye: up > .5 ? 1.45 : 1, mouth: up > .5 ? 2.2 : .5, ear: up > .5 ? -.5 : .3, tailPuff: lerp(1, 1.35, up) + (boom ? .3 : 0), armL: [lerp(.2, 2.2, up), lerp(.1, .9, up)], armR: [lerp(.2, 2.2, up), lerp(.1, .9, up)],
        brow: boom ? .9 : up > .5 ? .7 : 0, headTilt: up > .5 ? Math.sin(t * 25) * .04 : 0, jump: 0 });
      sqC.soot.visible = boom; blanket.position.set(-1.6, lerp(.85, .78, up), lerp(-.3, .3, up));
      phone.position.x = .3 + (ring ? Math.sin(t * 70) * .015 : 0); phone.rotation.y = ring ? Math.sin(t * 50) * .06 : 0;
      const age = t - 10;
      fire.forEach(m => { const u = m.userData, a = age; m.visible = a > 0 && a < u.life; if (!m.visible) return; const k = eo(clamp(a / .55));
        m.position.copy(BOOM).addScaledVector(u.d, u.sp * k).add(V(0, a * .9, 0)); m.scale.setScalar(u.sz * (.5 + k * 1.3) * (1 - ss(seg(a, u.life * .7, u.life)) * .7));
        m.material = fireM[a < .12 ? 0 : a < .35 ? 1 : a < .7 ? 2 : 3]; });
      sparks.forEach(m => { const u = m.userData; m.visible = age > 0 && age < .9; if (!m.visible) return; m.position.copy(BOOM).addScaledVector(u.d, u.sp * age).add(V(0, -2.5 * age * age, 0)); });
      smoke.forEach(m => { const u = m.userData, a = age - .12 - u.d * .6; m.visible = a > 0; if (!m.visible) return; m.position.set(BOOM.x + u.x * (.6 + a * .5), BOOM.y + .5 + a * 1.3, BOOM.z + u.z * (.6 + a * .4)); m.scale.setScalar(u.sz * (.5 + a * 1.0)); });
      flames.forEach(m => { const u = m.userData; m.visible = age > .35; if (!m.visible) return; const f = 1 + .35 * Math.sin(t * 17 + u.ph) + .2 * Math.sin(t * 29 + u.ph * 2); m.position.set(u.x, 1.05 + .45 * f * .5, u.z - 1.0); m.scale.set(1, f, 1); });
      fireL.intensity = age > 0 ? 60 * Math.exp(-age * 3) + 12 * (1 + .3 * Math.sin(t * 23)) : 0;
    },
    hud(t, g, { proj, PX }) {
      if (shot(t) === 'A') { const p = proj(sqA.anchors.headTop.getWorldPosition(new THREE.Vector3())); burst(g, p[0] + 170 * PX, p[1] + 40 * PX, PROPS.sigh, bk(t, .9, 2.4), { bg: '#eef0f6', fg: '#4a5a80', r: 85, fs: 44 }, PX); }
      if (shot(t) === 'B') { const p = proj(new THREE.Vector3(200 + 8, 2.2, -2.3)); burst(g, Math.min(p[0], 820 * PX), p[1] - 40 * PX, PROPS.honk + '!', Math.max(bk(t, 3.9, 4.5), bk(t, 4.6, 5.6)), { bg: '#ffd23f', fg: '#e8473b', r: 100, fs: 56 }, PX); }
      if (shot(t) === 'C' && t < 10) { const p = proj(new THREE.Vector3(-200 + .3, 1.0, -3.2)); burst(g, Math.min(p[0] + 60 * PX, 800 * PX), p[1] - 150 * PX, PROPS.ring + '!', bk(t, 7.1, 9.9) * (1 + .05 * Math.sin(t * 40)), { bg: '#ffffff', fg: '#e8473b', r: 110, fs: 58, sub: PROPS.call, rot: Math.sin(t * 30) * .06 }, PX); }
    },
  };
}

// ———————————————— 컷 4: 연기 속 칠판 ————————————————
function cut4(scene) {
  const W = new THREE.Group(); scene.add(W); const EV = [];
  { const fl = box(14, .2, 7, '#d9b48a', 0, -.1, -.5), wl = box(14, 5, .2, '#e6dcf2', 0, 2.5, -4); fl.castShadow = wl.castShadow = false; W.add(fl, wl); }
  const BW = 3.6, BH = 2.2, LT = [1.2, 2.3, 3.4];
  const tex = canvasTex(1440, 880, () => { });
  const draw = t => { const { g } = tex.userData; g.fillStyle = '#2f5a4a'; g.fillRect(0, 0, 1440, 880);
    g.globalAlpha = .06; for (let i = 0; i < 12; i++) { g.fillStyle = '#fff'; g.fillRect(80 + i * 110, 60 + (i * 53) % 700, 160, 30); } g.globalAlpha = 1;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    PROPS.board.forEach((l, i) => { const u = clamp((t - LT[i]) / .9); if (u <= 0) return; g.font = `700 ${i ? 118 : 124}px "Gaegu"`; const w = g.measureText(l).width, x = (1440 - w) / 2, y = 190 + i * 250;
      g.save(); g.beginPath(); g.rect(x - 10, y - 120, (w + 20) * u, 240); g.clip(); g.fillStyle = i ? '#fff2a8' : '#fffdf3'; g.fillText(l, x, y); g.restore();
      if (i === 0 && u >= 1) { g.strokeStyle = '#ffb4a8'; g.lineWidth = 8; g.beginPath(); g.moveTo(x, y + 80); g.lineTo(x + w, y + 80); g.stroke(); } });
    tex.needsUpdate = true; };
  const board = grp(box(BW + .3, BH + .3, .16, '#a8784e', 0, 0, 0)); const face = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: tex, roughness: .95 })); face.position.z = .09; board.add(face);
  board.position.set(.4, 2.55, -3.6); W.add(board);
  W.add(box(.12, 2.6, .12, '#8e6340', -1.45, 1.3, -3.66), box(.12, 2.6, .12, '#8e6340', 2.25, 1.3, -3.66));
  const sq = makeSquirrel(); sq.root.scale.setScalar(.85); sq.root.position.set(-1.0, 0, -2.0); W.add(sq.root); sq.soot.visible = true;
  const chalk = box(.05, .2, .05, '#ffffff', 0, -.36, .1); sq.arms[1].a.add(chalk);
  const smM = new THREE.MeshStandardMaterial({ color: '#9a9aa0', transparent: true, opacity: .7, roughness: 1, depthWrite: false }), smoke = [];
  for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), smM); s.userData = { x: -3 + (i % 6) * 1.2, z: -2.6 + Math.floor(i / 6) * 1.6, y: .6 + (i % 3) * .7, r: .8 + (i % 4) * .25 }; W.add(s); smoke.push(s); }
  EV.push({ t: .35, type: 'cough' }, { t: 1.0, type: 'cough' }, { t: 1.2, type: 'chalk', d: .9 }, { t: 2.3, type: 'chalk', d: .9 }, { t: 3.4, type: 'chalk', d: .9 }, { t: 4.6, type: 'ting' }, { t: 0, type: 'amb', what: 'room', d: 6 });
  return {
    W, EV, dur: 6, sky: ['#5c5c66', '#8a8a94'], aoAmt: 0,
    cam(t) { const u = ss(seg(t, 0, 6)); const pos = [lerp(1.4, 1.1, u), lerp(3.0, 2.9, u), lerp(6.4, 5.9, u)];
      return { pos, look: [.1, 1.55, -3.0], fov: 46, near: .2, far: 100, focus: V(...pos).distanceTo(V(-.2, 1.8, -3)), aper: 10, maxCoc: 18, band: { at: [-.2, 2.1, -3], w: .2, amp: 18, mix: .55 } }; },
    sun: t => ({ az: 25, el: 50, target: [0, 1, -2], span: 8 }),
    light(t, { sun, hemi }) { sun.intensity = 2.0; hemi.intensity = 1.2; },
    update(t) {
      draw(t);
      const cough = Math.max(...[.35, 1.0].map(a => t > a && t < a + .35 ? Math.sin((t - a) / .35 * Math.PI) : 0)), write = LT.some(a => t > a && t < a + .9);
      sq.pose({ armR: write ? [1.6 + Math.sin(t * 18) * .08, 1.3 + Math.sin(t * 11) * .12] : [1.2, .6], armL: cough > 0 ? [2.3, .3] : [.6, .2], lid: .45, eye: 1, mouth: cough > 0 ? 1.6 : .7, brow: -.3, lean: cough * .2, squash: 1 - cough * .06,
        tailPuff: 1.45, ear: .4, headNod: cough * .25, headTurn: write ? -.5 : .1 });
      sq.root.rotation.y = write ? -.5 : .15;
      smoke.forEach((m, i) => { const d = m.userData, k = t * .25; m.position.set(d.x + Math.sin(t * .6 + i) * .3, d.y + k, d.z); m.scale.setScalar(d.r * .55 * (1 + k * .5)); });
      smM.opacity = .75 * (1 - ss(seg(t, .3, 3.0)));
      smoke.forEach(m => { m.visible = smM.opacity > .01; });
    },
    hud(t, g, { proj, PX }) {
      const p = proj(sq.anchors.headTop.getWorldPosition(new THREE.Vector3()));
      burst(g, p[0] + 150 * PX, p[1] + 10 * PX, PROPS.cough, Math.max(bk(t, .35, 1.0), bk(t, 1.0, 1.9)), { bg: '#eeeeee', fg: '#3a3a40', r: 80, fs: 46 }, PX);
    },
  };
}

function cut0(scene) {
  const W = new THREE.Group(); scene.add(W); const sq = makeSquirrel(); W.add(sq.root); const QS = new URLSearchParams(location.search);
  return { W, EV: [], dur: 1, sky: ['#fff', '#fff'], cam: () => ({ pos: [0, 1.15, 9], look: [0, 1.05, 0], fov: 18, focus: 9, aper: 0, maxCoc: 0, band: { w: 1, amp: 0, mix: 0 } }),
    sun: () => ({ az: 20, el: 50, target: [0, 1, 0], span: 3 }), light(t, { sun, hemi }) { sun.intensity = 1.6; hemi.intensity = 1.6; }, update() { sq.pose({}); } };
}
export const BUILD = { 0: cut0, 1: cut1, 2: cut2, 3: cut3, 4: cut4 };
