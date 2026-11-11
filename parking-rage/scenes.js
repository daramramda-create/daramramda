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

// ———————————————— 컷 1: 단지 입구, 선글라스 다람쥐 ————————————————
function cut1(scene) {
  const R = mulberry(4), W = new THREE.Group(); scene.add(W); const EV = [];
  W.add(box(120, .2, 120, '#d7d3c9', 0, -.1, 0));                                   // 단지 바닥
  W.add(box(80, .02, 8, '#5b5f66', 10, .01, 4));                                     // 단지 안 도로
  for (let x = -10; x < 50; x += 6) W.add(box(3, .02, .2, '#f2c230', x, .03, 4));
  // 잔디 + 나무
  [[-14, 10], [14, 10], [-14, 30], [14, 30]].forEach(([x, z]) => W.add(box(14, .3, 14, '#5cc25a', x, .15, z)));
  for (let i = 0; i < 16; i++) { const x = (R() < .5 ? -1 : 1) * (8 + R() * 12), z = 4 + R() * 32; W.add(grp(mesh(new THREE.CylinderGeometry(.18, .22, 2, 8), M('#6b4a32'), x, 1, z), mesh(new THREE.IcosahedronGeometry(1.6, 2), M(['#3faa3c', '#56c046'][i % 2]), x, 2.8, z))); }
  // 아파트 동 (뒤쪽)
  [[-24, -16, '#f4efe6'], [0, -22, '#eef1f6'], [24, -16, '#f6ece0']].forEach(([x, z, wall], i) => { const b = building(16, 10, 42, R, { wall, shop: null }); b.position.set(x, 0, z); W.add(b);
    const s = signBoard(5, 1.8, i === 1 ? PROPS.apt2 : PROPS.apt, { bg: '#ffffff', fg: '#1b2f5c', fs: [.6], border: false, d: .2, px: 60 }); s.position.set(0, 38, 5.2); b.add(s); });
  // 지하주차장 입구: 지붕 있는 경사로
  const gate = new THREE.Group(); gate.position.set(-13, 0, 4); gate.rotation.y = Math.PI / 2; W.add(gate);
  gate.add(box(.6, 3.6, 12, '#e3e7e3', -4.2, 1.8, -2), box(.6, 3.6, 12, '#e3e7e3', 4.2, 1.8, -2), box(9, .5, 6, '#e3e7e3', 0, 3.8, -5));
  const ramp = box(7.8, .2, 12, '#3a3e45', 0, -1.2, -2); ramp.rotation.x = -.22; gate.add(ramp);
  gate.add(box(7.8, 3.4, .2, '#101216', 0, -1.2, -8.2));                              // 어두운 안쪽
  const gs = signBoard(7.2, 1.3, PROPS.gate + ' ' + PROPS.ent, { bg: '#1b2f5c', fg: '#ffffff', fs: [.62], border: false, d: .25, px: 60 }); gs.position.set(0, 4.7, -2.1); gate.add(gs);
  gate.add(box(.3, .3, 3.2, '#f2c230', -2.7, 1.6, 2.6), box(.3, .3, 3.2, '#f2c230', 2.7, 1.6, 2.6));   // 차단기 느낌
  // 주인공 차
  const car = makeCar('#ff8fa3', { open: true, lights: true }); W.add(car);
  const sq = driver(car); sq.glasses.visible = true;
  const path = pathFn([[16, 0, 4], [8, 0, 4], [-4, 0, 4], [-12, -.4, 4]]);
  EV.push({ t: .2, type: 'engine' }, { t: 0, type: 'amb', what: 'outdoor', d: 5 });
  return {
    W, EV, dur: 5, sky: ['#9fe3cf', '#e6f8f1'],
    cam(t) { const P = path(ei(seg(t, .4, 5.4)) * .9).p, u = ss(seg(t, 0, 5));
      const look = [P.x + .1, 1.25, P.z], pos = [P.x - lerp(3.5, 2.8, u), lerp(8, 7.2, u), P.z + lerp(12.5, 11.5, u)];
      return { pos, look, fov: 32, near: .5, far: 800, focus: V(...pos).distanceTo(V(P.x, 1.5, P.z)), aper: 26, maxCoc: 22, band: { at: [P.x, 1.6, P.z], w: .12, amp: 24, mix: .6 } }; },
    sun: t => ({ az: 210, el: 50, target: [0, 0, 8], span: 30 }),
    light(t, { sun, hemi }) { sun.intensity = 3.0; hemi.intensity = 1.1; },
    update(t) {
      const u = ei(seg(t, .4, 5.4)) * .9, P = path(u); car.position.copy(P.p); car.rotation.y = P.yaw; car.rotation.x = P.p.y < -.05 ? .2 : 0;
      const bob = Math.sin(t * 9) * .02 * (t > .4 ? 1 : 0);
      sq.pose({ armL: [1.25, .25 + Math.sin(t * 3) * .06], armR: [1.25, .25 - Math.sin(t * 3) * .06], mouth: .8, headTilt: Math.sin(t * 2.2) * .12, headTurn: .55 + Math.sin(t * 1.4) * .1, jump: bob, tailSway: Math.sin(t * 3) * .1, lean: -.1 });
      car.userData.wheel && (car.userData.wheel.rotation.z = Math.sin(t * 2) * .2);
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
  const pB = pathFn([[0, 0, 14], [0, 0, 2], [0, 0, -10]]);
  const pC = pathFn([[0, 0, -12], [0, 0, -19], [0, -1.7, -26], [0, -3.4, -33]]);
  const shot = t => t < 2.35 ? 'A' : t < 4.65 ? 'B' : 'C';
  EV.push({ t: .35, type: 'moktak' }, { t: 1.2, type: 'stop' }, { t: 2.3, type: 'blip', n: 0 }, { t: 2.6, type: 'vsign' }, { t: 4.6, type: 'blip', n: 1 }, { t: 6.9, type: 'blip', n: 2 }, { t: 0, type: 'amb', what: 'garage', d: 7 });
  [.1, 2.35, 4.65].forEach(t => EV.push({ t, type: 'card' }));
  const carAt = t => { const s = shot(t); if (s === 'A') { const u = eo(seg(t, 0, 1.25)); return pA(u); } if (s === 'B') return pB(seg(t, 2.35, 4.65)); return pC(ei(seg(t, 4.65, 7.3))); };
  return {
    W, EV, dur: 7, sky: ['#cfd8d4', '#e9efec'],
    shot,
    cam(t) {
      const s = shot(t), P = carAt(t).p;
      if (s === 'A') return { pos: [-12.5, 7.5, 5.5], look: [-5.2, .7, -.4], fov: 36, near: .5, far: 300, focus: V(-12.5, 7.5, 5.5).distanceTo(V(-5.5, 1.4, 1)), aper: 24, maxCoc: 22, band: { at: [P.x, 1.6, P.z], w: .12, amp: 22, mix: .6 } };
      if (s === 'B') { const pos = [P.x + 4.5, 6.5, P.z - 8]; return { pos, look: [P.x, 1.1, P.z - .5], fov: 34, near: .5, far: 300, focus: V(...pos).distanceTo(P), aper: 24, maxCoc: 22, band: { at: [P.x, 1.6, P.z], w: .12, amp: 22, mix: .6 } }; }
      const pos = [P.x + 4, P.y + 6, P.z - 8.5]; return { pos, look: [P.x, P.y + 1.1, P.z - .5], fov: 34, near: .5, far: 300, focus: V(...pos).distanceTo(P), aper: 24, maxCoc: 22, band: { at: [P.x, P.y + 1.6, P.z], w: .12, amp: 22, mix: .6 } };
    },
    sun: t => ({ az: 30, el: 70, target: [0, 0, carAt(t).p.z], span: 18 }),
    light(t, { sun, hemi }) { sun.intensity = 1.6; hemi.intensity = 1.5; },
    update(t) {
      const s = shot(t), P = carAt(t); car.position.copy(P.p); car.rotation.y = P.yaw; car.rotation.x = s === 'C' && P.p.y < -.05 ? .24 : 0;
      const tt = t, zen = s === 'A', lucky = s === 'B', pout = s === 'C';
      const v = lucky ? env(t, 2.6, 4.5, .15, .2) : 0, wig = Math.sin(t * 12) * .15 * v;
      sq.glasses.visible = !zen || t < .2;   // 해탈: 눈 감은 얼굴이 보이게 선글라스를 이마로
      sq.pose({
        armL: zen ? [1.25, .25] : [1.25, .25], armR: lucky ? [lerp(1.25, .4, v), lerp(.25, 2.7, v) + wig] : [1.25, .25],
        lid: zen ? ss(seg(t, .2, .5)) : pout ? .3 : 0, mouth: zen ? .7 : lucky ? 1.5 : .45 + .1 * Math.sin(t * 8), brow: pout ? .55 : 0,
        headTilt: zen ? .1 + Math.sin(tt * 1.5) * .05 : lucky ? Math.sin(tt * 6) * .15 : -.12, headNod: zen ? -.08 : pout ? .12 : 0, headTurn: lucky ? .35 : 0,
        jump: lucky ? Math.abs(Math.sin(t * 7)) * .05 : 0, tailSway: Math.sin(t * 3) * .1, ear: pout ? .5 : 0,
      });
      if (zen) { sq.glasses.position.set(0, .62, -.12); sq.glasses.rotation.x = -.35; sq.glasses.visible = true; } else { sq.glasses.position.set(0, 0, 0); sq.glasses.rotation.x = 0; }
    },
  };
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
  [[-14, -18], [14, -18]].forEach(([x, z], i) => { const b = building(26, 11, 15, R, { wall: i ? '#e6d6bd' : '#ead9c2', shop: null }); b.position.set(x, 0, z); B.add(b);
    const s = signBoard(4.4, 1.6, i ? PROPS.apt2 : PROPS.apt, { bg: '#ffffff', fg: '#1b2f5c', fs: [.6], border: false, d: .2, px: 60 }); s.position.set(0, 12.6, 5.7); b.add(s); });
  for (let x = -24; x <= 24; x += 2.7) { B.add(box(.12, .02, 5.2, '#f2f0e8', x, .02, -8.5)); B.add(box(.12, .02, 5.2, '#f2f0e8', x, .02, 4)); }
  const parkedB = [];
  for (let x = -22.6; x <= 22.6; x += 2.7) { [[-8.5, 0], [4, Math.PI]].forEach(([z, ry]) => { const c = makeCar(CARC[Math.floor(R() * CARC.length)]); c.position.set(x, 0, z); c.rotation.y = ry; B.add(c); }); }
  for (let x = -20; x <= 20; x += 4.3) { if (Math.abs(x - .3) < 1) continue; const c = makeCar(CARC[Math.floor(R() * CARC.length)]); c.position.set(x, 0, -2.3); c.rotation.y = Math.PI / 2; B.add(c); parkedB.push(c); }   // 이중주차 줄
  const pushCar = makeCar('#f2c230'); pushCar.rotation.y = Math.PI / 2; B.add(pushCar);
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
  const smoke = []; const smM = new THREE.MeshStandardMaterial({ color: '#5e5e66', transparent: true, opacity: .6, roughness: 1, depthWrite: false });
  for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), smM); s.userData = { a: i * 2.4, r: .5 + (i % 4) * .25, h: .9 + (i % 5) * .35 }; s.visible = false; C.add(s); smoke.push(s); }
  const shot = t => t < 3.1 ? 'A' : t < 6.6 ? 'B' : 'C';
  EV.push({ t: .1, type: 'card' }, { t: 3.1, type: 'card' }, { t: 6.6, type: 'card' }, { t: .9, type: 'sigh' }, { t: 2.9, type: 'blip', n: 3 }, { t: 3.9, type: 'honk' }, { t: 4.6, type: 'honk' }, { t: 6.4, type: 'blip', n: 4 },
    { t: 7.1, type: 'ring', d: 2.8 }, { t: 7.7, type: 'gasp' }, { t: 9.8, type: 'blip', n: 5 }, { t: 10.0, type: 'boom' }, { t: 0, type: 'amb', what: 'dungeon', d: 3.1 }, { t: 3.1, type: 'amb', what: 'outdoor', d: 3.5 }, { t: 6.6, type: 'amb', what: 'room', d: 5.4 });
  const sit = t => ss(seg(t, 7.65, 7.9));
  return {
    W, EV, dur: 12, sky: ['#2a2f3a', '#3e4552'], shot,
    cam(t) {
      const s = shot(t), sh = t > 10 ? Math.exp(-(t - 10) * 3) * .25 : 0, j = [Math.sin(t * 53) * sh, Math.cos(t * 41) * sh, 0];
      if (s === 'A') { const u = ss(seg(t, 0, 3.1)); const pos = [lerp(6, 5, u), lerp(6, 5.2, u), lerp(9, 8, u)]; return { pos, look: [1.4, .25, .9], fov: 38, near: .3, far: 300, focus: V(...pos).distanceTo(V(1.9, 1.2, 2.2)), aper: 22, maxCoc: 22, band: { at: [1.9, 1.2, 2.2], w: .13, amp: 22, mix: .6 } }; }
      if (s === 'B') { const u = ss(seg(t, 3.1, 6.6)); const pos = [200 + lerp(2.5, 1.8, u), lerp(7, 6.4, u), lerp(8.5, 7.8, u)]; return { pos, look: [200 - .9, .8, -1.9], fov: 34, near: .5, far: 400, focus: V(...pos).distanceTo(V(201.5, 1, -2.3)), aper: 30, maxCoc: 24, band: { at: [199.2, 1.2, -1.6], w: .13, amp: 24, mix: .6 } }; }
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
      const push = ss(seg(t, 3.4, 6.4)), jit = Math.sin(t * 30) * .02;
      pushCar.position.set(lerp(.3, 1.3, push) + jit, 0, -2.3); sqB.root.position.set(pushCar.position.x - 2.6, 0, -1.6); sqB.root.rotation.y = Math.PI / 2 - .55;
      sqB.pose({ armL: [1.55, .05], armR: [1.55, .05], lean: .38 + Math.sin(t * 8) * .04, brow: .8, eye: .9, lid: .3, mouth: .5, sweat: (t * 2.2) % 1, squash: .94 + Math.sin(t * 8) * .03, ear: .6, tailPuff: 1.1, headNod: .1 });
      // C: 침대 → 벌떡 → 펑
      const up = sit(t), boom = t > 10, sootK = ss(seg(t, 10, 10.15));
      sqC.root.position.set(-1.6, lerp(.7, .55, up) + (t > 7.65 && t < 8.1 ? Math.sin((t - 7.65) / .45 * Math.PI) * .5 : 0), lerp(-1.35, -1.0, up));
      sqC.root.rotation.x = lerp(-1.32, 0, up);
      const ring = t > 7.1 && t < 9.9;
      sqC.pose({ lid: up > .5 ? 0 : 1, eye: up > .5 ? 1.45 : 1, mouth: up > .5 ? 2.2 : .5, ear: up > .5 ? -.5 : .3, tailPuff: lerp(1, 1.35, up) + (boom ? .3 : 0), armL: [lerp(.2, 2.2, up), lerp(.1, .9, up)], armR: [lerp(.2, 2.2, up), lerp(.1, .9, up)],
        brow: boom ? .9 : up > .5 ? .7 : 0, headTilt: up > .5 ? Math.sin(t * 25) * .04 : 0, jump: 0 });
      sqC.soot.visible = boom; blanket.position.set(-1.6, lerp(.85, .78, up), lerp(-.3, .3, up));
      phone.position.x = .3 + (ring ? Math.sin(t * 70) * .015 : 0); phone.rotation.y = ring ? Math.sin(t * 50) * .06 : 0;
      smoke.forEach((m, i) => { const ds = t - 10 - i * .03; m.visible = ds > 0; if (!m.visible) return; const { a, r, h } = m.userData; const k = eo(clamp(ds / 1.2));
        m.position.set(-1.6 + Math.cos(a) * r * (1 + k * 1.6), h + k * 1.2, -1.4 + Math.sin(a) * r * (1 + k * 1.2)); m.scale.setScalar(.08 + k * (.22 + (i % 3) * .08)); });
      smM.opacity = .6 * (1 - ss(seg(t, 10.8, 12)));
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
