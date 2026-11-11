// 컷 4개의 세계, 배우, 카메라. 단위 = 미터. 각 컷은 t=0부터.
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, ei, lerp, monotone, mulberry } from '/core/lib.js';
import { M, SKIN, mesh, box, cyl, sph, grp, pop, canvasTex, signBoard } from './lib3d.js';
import { makeSquirrel } from './squirrel.js';
import { buildTown, building, makeCars, makeWalkers, ROADS } from './town.js';
import { CUTS, PROPS } from './story.js';

const env = (t, a, b, fi = .15, fo = .15) => Math.min(ss(seg(t, a, a + fi)), 1 - ss(seg(t, b - fo, b)));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// 타임랩스 시계: segs [[t0, 배속]], 배속>1 이면 8Hz로 끊어서 진행. 반환 = 화면 속 세계 시간(초)
const VIS = sp => sp > 1 ? 7 : 1;   // 화면에서 읽히는 실제 이동 배율 (×40 표기를 그대로 쓰면 차가 순간이동)
function simTime(t, segs, rate = 8) {
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const a = segs[i][0], b = i + 1 < segs.length ? segs[i + 1][0] : Infinity, sp = segs[i][1];
    if (t <= a) break;
    let e = Math.min(t, b), dt = e - a;
    if (sp > 1 && e === t) dt = Math.floor(dt * rate) / rate;
    acc += dt * VIS(sp);
  }
  return acc;
}
const stepT = (t, on, rate = 8) => on ? Math.floor(t * rate) / rate : t;
function popIn(o, t, t0, base = 1) { const s = t - t0; o.visible = s > 0; o.scale.setScalar(base * Math.max(.001, pop(s))); }
// 배우 크기의 승객: 매끈한 몸 + 머리
const SH = ['#e8473b', '#2f7fd8', '#f2c230', '#1f9e5c', '#7a5cd6', '#f08cb0', '#30343c', '#ffffff'];
function passenger(R, o = {}) {
  const c = SH[Math.floor(R() * SH.length)], skin = ['#f0c9a0', '#d9a77c', '#f5d6b8'][Math.floor(R() * 3)];
  const g = new THREE.Group();
  g.add(mesh(new THREE.CapsuleGeometry(.24, .78, 8, 16), SKIN(c), 0, .95, 0));
  g.add(mesh(new THREE.CapsuleGeometry(.11, .7, 6, 10), SKIN('#2d3646'), -.1, .42, 0), mesh(new THREE.CapsuleGeometry(.11, .7, 6, 10), SKIN('#2d3646'), .1, .42, 0));
  g.add(mesh(new THREE.SphereGeometry(.15, 20, 14), SKIN(skin), 0, 1.58, 0));
  g.add(mesh(new THREE.SphereGeometry(.155, 20, 14, 0, Math.PI * 2, 0, 1.3), SKIN(['#2a1d16', '#4a3020', '#111'][Math.floor(R() * 3)]), 0, 1.6, -.01));
  if (o.phone) g.add(box(.08, .14, .02, '#222', .12, 1.25, .2));
  if (o.arm) { const a = mesh(new THREE.CapsuleGeometry(.07, .55, 6, 10), SKIN(c), .22, 1.55, 0); a.rotation.z = -.2; g.add(a); }
  return g;
}

// ———————————————— 컷 1: 만원 지하철, 멍한 다람쥐 ————————————————
function cut1(scene) {
  const W = new THREE.Group(); scene.add(W);
  const R = mulberry(11), EV = [];
  // 객차 (x = 길이 방향). 먼 벽(z=-1.5)에 큰 창, 바깥은 고가에서 내려다본 동네
  const wallC = '#eef1f4', trim = '#c9ced6';
  W.add(box(16, .06, 3.2, '#9aa3ad', 0, -.03, 0));                          // 바닥
  W.add(box(16, .06, 3.2, '#f6f7f8', 0, 2.33, 0));                          // 천장
  for (let x = -6; x <= 6; x += 3) W.add(mesh(new THREE.BoxGeometry(1.8, .04, .18), M('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1.2 }), x, 2.29, -.4));
  W.add(box(16, .9, .12, wallC, 0, .45, -1.55), box(16, .3, .12, wallC, 0, 2.15, -1.55));
  for (let x = -7.4; x <= 7.4; x += 2.6) W.add(box(.5, 1.1, .12, wallC, x, 1.45, -1.55));
  W.add(box(16, .06, .16, trim, 0, .92, -1.5), box(16, .06, .16, trim, 0, 2.0, -1.5));
  // 문 (x 1.6–3.0): 두 짝이 닫힌다
  const doorM = M('#d8dde3', { roughness: .4, metalness: .3 });
  const doors = [-1, 1].map(s => { const d = grp(box(.7, 2.0, .06, doorM, 0, 1.0, 0), mesh(new THREE.BoxGeometry(.42, .7, .02), M('#9fc6e0', { roughness: .1 }), 0, 1.35, .04)); d.position.set(2.3, 0, -1.47); W.add(d); return { d, s }; });
  W.add(box(.06, 2.2, .14, '#f2c230', 1.58, 1.1, -1.46), box(.06, 2.2, .14, '#f2c230', 3.02, 1.1, -1.46));
  // 의자 (먼 벽 쪽)
  W.add(box(4.5, .1, .5, '#2f7fd8', -3.6, .45, -1.25), box(4.5, .5, .1, '#2f7fd8', -3.6, .72, -1.48));
  W.add(box(4.5, .1, .5, '#2f7fd8', 6, .45, -1.25));
  // 손잡이 봉과 손잡이
  W.add(mesh(new THREE.CylinderGeometry(.02, .02, 16, 12), M('#c9ced6', { metalness: .7, roughness: .3 }), 0, 2.05, -.25)); W.children[W.children.length - 1].rotation.z = Math.PI / 2;
  const straps = [];
  for (let x = -3; x <= 3; x += .45) {
    const len = .22;   // 다람쥐 위 손잡이만 길게 (키가 작아서)
    const st = grp(box(.035, len, .015, '#1f9e5c', 0, -len / 2, 0), mesh(new THREE.TorusGeometry(.065, .014, 8, 20), M('#f4f4f4'), 0, -len - .06, 0));
    st.position.set(x, 2.04, -.25); W.add(st); straps.push({ st, x, len });
  }
  W.add(mesh(new THREE.CylinderGeometry(.022, .022, 2.3, 12), M('#c9ced6', { metalness: .7, roughness: .3 }), -1.2, 1.15, .2));
  W.add(mesh(new THREE.CylinderGeometry(.025, .025, 2.3, 12), M('#f2c230', { metalness: .3, roughness: .4 }), 1.05, 1.15, -.3));
  // 승객 (만원): 다람쥐 양옆과 카메라 앞 흐린 전경
  const pas = [
    [-.5, -.3, .5, {}], [.36, -.42, -.5, { phone: true }], [-.1, -.85, 0, {}], [-1.15, -.2, .6, { phone: true }], [1.05, -.25, -.4, { arm: true }],
    [-.6, 1.1, 3.0, {}], [1.9, 1.0, 3.3, {}], [-2.3, -.6, .2, { arm: true }], [2.4, -.7, -.2, {}], [-3.1, -.3, .5, { phone: true }],
  ].map(([x, z, ry, o]) => { const p = passenger(R, o); p.position.set(x, 0, z); p.userData.x0 = x; p.rotation.y = ry; W.add(p); return p; });
  // 다람쥐 (배우: 실제보다 크게, 매끈하게)
  const sq = makeSquirrel(); const SC = .58; sq.root.scale.setScalar(SC); sq.root.position.set(-.1, 0, -.25); W.add(sq.root);
  // 창밖 동네: 고가 아래로 지나간다
  const town = buildTown(scene, { seed: 21, residential: (x, z) => x < 0 });
  town.root.position.set(0, -26, -62); town.root.rotation.y = .15;
  const cars = makeCars(town.root, 22, 4), walkers = makeWalkers(town.root, 40, 6);
  EV.push({ t: 0, type: 'doorClose' }, { t: .3, type: 'sub' }, { t: 3.4, type: 'sub' }, { t: 4.0, type: 'boing' }, { t: 0, type: 'amb', what: 'train', d: 6 });
  const SEG = [[0, 40]];
  return {
    W, EV, dur: 6, sky: ['#a9d8f5', '#dff1fb'],
    cam(t) {
      const u = ss(seg(t, 0, 6)), jolt = t > 4.0 ? Math.exp(-(t - 4.0) * 8) * Math.sin((t - 4.0) * 40) * .01 : 0;
      const pos = [lerp(1.5, 1.3, u), 1.45 + jolt, lerp(2.6, 2.3, u)];
      return { pos, look: [-.05, .93, -.5], fov: 40, near: .05, far: 600,
        focus: V(...pos).distanceTo(V(-.1, 1.0, -.25)), aper: 12, maxCoc: 20,
        band: { at: [-.1, 1.0, -.25], w: .14, amp: 20, mix: .55 } };
    },
    sun: t => ({ az: 160, el: 38, target: [0, 1, 0], span: 6 }),
    light(t, { sun, hemi }) { sun.intensity = 2.2; hemi.intensity = 1.25; },
    update(t) {
      const simT = simTime(t, SEG);
      town.root.position.x = 55 - (simT * 14) % 110;
      cars.update(simT); walkers.update(simT);
      doors.forEach(({ d, s }) => { const k = ss(seg(t, 0, .35)); d.position.x = 2.3 + s * lerp(1.1, .35, k); });
      // 흔들림: 열차가 달리는 리듬
      const sway = Math.sin(t * 2.2) * .03 + Math.sin(t * 5.3) * .008;
      W.children.forEach(o => { if (o.userData.p) { } });
      // 만원: 양옆 승객이 흔들림마다 다람쥐 쪽으로 밀고 들어온다
      const press = .5 + .5 * Math.sin(t * 2.2 * 2) * .6 + .4 * Math.max(0, Math.sin(t * 1.3));
      pas.forEach((p, i) => { p.rotation.z = sway * (i % 2 ? 1 : -.8); p.position.x = p.userData.x0 + (i === 0 ? 1 : i === 1 ? -1 : 0) * press * .07; });
      straps.forEach(({ st, x }) => { st.rotation.x = Math.sin(t * 2.2 + x) * .12; });
      // 다람쥐: 멍 → 4.0 띠용
      const boing = t > 4.0 ? Math.exp(-(t - 4.0) * 5) * Math.cos((t - 4.0) * 24) : 0, wake = ss(seg(t, 3.95, 4.05));
      const slip = t > 4.0 && t < 4.6 ? Math.sin(Math.PI * (t - 4.0) / .6) : 0;
      // 꽉 끼어 찌그러진 몸 (좁고 길게), 질끈 감은 눈, 눌린 귀, 땀
      const squeeze = (1.16 + press * .09) * (1 - wake * .5) + wake * .5 * 1.05;
      const strug = Math.sin(t * 9) * .06 * (1 - wake);
      sq.pose({
        armR: [lerp(.6, .3, wake) + strug, lerp(2.7, 2.9, wake) - slip * .5], armL: [lerp(.9, .4, wake), lerp(.25, 2.6, wake) + strug],
        lid: lerp(.78 + .1 * Math.sin(t * 5), 0, wake), eye: 1 + wake * .5 + boing * .25, mouth: lerp(.6 + .15 * Math.abs(Math.sin(t * 6)), 2.2, wake), ear: lerp(1.1, -.45, wake),
        jump: boing * .1 + slip * .06 + press * .03, squash: squeeze + boing * .1, headTilt: lerp(sway * 4 + .18 * Math.sin(t * 2.2), Math.sin(t * 30) * .05 * wake, wake), headNod: lerp(.15, -.08, wake), lean: sway * 1.5,
        tailSway: Math.sin(t * 2.2) * .08, tailPuff: lerp(.82, 1.3, wake), sweat: (1 - wake) * ((t * 1.5) % 1),
      });
      sq.root.rotation.y = .1;
    },
  };
}

// ———————————————— 컷 2: 계산기 ————————————————
function calcTex() { return canvasTex(360, 120, () => { }); }
function cut2(scene) {
  const W = new THREE.Group(); scene.add(W);
  const R = mulberry(5), EV = [];
  // 사무실: 책상, 뒤 창문 너머 동네
  W.add(box(.9, .45, .6, '#3a3f48', -.05, .225, -.25), box(1.9, .05, .9, '#d9b48a', 0, .75, .1), box(.06, .73, .06, '#8e6a48', -.85, .37, -.25), box(.06, .73, .06, '#8e6a48', .85, .37, -.25), box(.06, .73, .06, '#8e6a48', -.85, .37, .45), box(.06, .73, .06, '#8e6a48', .85, .37, .45));
  W.add(box(6, .04, 6, '#c9c2b6', 0, 0, 0));
  // 창틀 (뒤쪽)
  W.add(box(6, .8, .1, '#f2efe9', 0, .4, -1.6), box(6, .4, .1, '#f2efe9', 0, 3.3, -1.6), box(.12, 2.4, .12, '#e3ded5', -.8, 2.0, -1.55), box(.12, 2.4, .12, '#e3ded5', .8, 2.0, -1.55));
  const town = buildTown(scene, { seed: 33, residential: (x, z) => x < 0 }); town.root.position.set(0, -38, -90); town.root.scale.setScalar(1);
  const cars = makeCars(town.root, 20, 8);
  // 소품: 머그, 서류, 펜, 모니터 뒷면
  W.add(cyl(.05, .045, .11, 16, '#f2796b', -.62, .83, .3), box(.3, .01, .4, '#ffffff', .55, .78, .2), box(.31, .012, .41, '#eef0f2', .56, .79, .21));
  const mon = grp(box(.62, .38, .03, '#2b2f36', 0, 1.15, 0), box(.05, .3, .05, '#2b2f36', 0, .9, -.03)); mon.position.set(-.55, 0, -.25); mon.rotation.y = .35; W.add(mon);
  // 계산기
  const disp = canvasTex(400, 120, () => { });
  const calc = grp(box(.36, .05, .5, '#3a3f48', 0, .025, 0));
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(.3, .09), new THREE.MeshBasicMaterial({ map: disp, toneMapped: false })); dm.rotation.x = -Math.PI / 2; dm.position.set(0, .052, -.17); calc.add(dm);
  const keys = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const k = box(.06, .02, .055, c === 3 ? '#f08c3a' : '#e8eaee', -.11 + c * .073, .06, -.07 + r * .068); calc.add(k); keys.push(k); }
  calc.position.set(.14, .775, .25); calc.rotation.x = .12; calc.scale.setScalar(.75); W.add(calc);
  // 다람쥐: 책상 뒤
  const sq = makeSquirrel(); const SC = .34; sq.root.scale.setScalar(SC); sq.root.position.set(-.05, .5, .0); W.add(sq.root);
  // 숫자 판: 계산기 위로 튀어나와 쌓인다
  const P = CUTS[2].panels;
  const spots = [[-.23, 1.64], [.21, 1.64], [-.23, 1.45], [.21, 1.45], [-.01, 1.55]];
  const panels = P.map((p, i) => {
    const big = !!p.big, txt = p.text.replace(/[\[\]]/g, '');
    const b = signBoard(big ? .62 : .38, big ? .2 : .13, txt, { bg: big ? '#ffd23f' : '#1b2f5c', fg: big ? '#1b2f5c' : '#ffffff', fs: [.55], edge: big ? '#e0b420' : '#13244a', d: .03, px: 600, border: false });
    W.add(b); return { b, p, spot: spots[i], big };
  });
  let shown = '0';
  P.forEach(p => { EV.push({ t: p.t - .12, type: 'key' }, { t: p.t - .3, type: 'key' }, { t: p.t, type: p.big ? 'ding' : 'pop' }); });
  EV.push({ t: 3.75, type: 'shock' }, { t: 0, type: 'amb', what: 'office', d: 7 });
  return {
    W, EV, dur: 7, sky: ['#a9d8f5', '#e4f3fb'],
    cam(t) {
      const u = ss(seg(t, 0, 7)), k = ss(seg(t, 3.6, 4.1));
      const pos = [lerp(.1, .04, u), 1.3, lerp(2.5, 2.3, u)], look = [0, 1.13, .1];
      return { pos, look, fov: 52, near: .05, far: 900, focus: V(...pos).distanceTo(V(0, 1.2, .1)), aper: 8, maxCoc: 18,
        band: { at: [0, lerp(1.0, 1.35, k), .1], w: lerp(.16, .22, k), amp: 20, mix: .6 } };
    },
    sun: t => ({ az: 200, el: 40, target: [0, 1, 0], span: 4 }),
    light(t, { sun, hemi }) { sun.intensity = 2.0; hemi.intensity = 1.3; },
    update(t) {
      cars.update(t);
      // 계산기 화면
      let val = '0'; P.forEach(p => { if (t >= p.t - .3) val = p.key; });
      if (val !== shown) { shown = val; const { g } = disp.userData; g.fillStyle = '#c8d8b0'; g.fillRect(0, 0, 400, 120); g.fillStyle = '#1e2a14'; g.font = '600 92px "Overpass Mono"'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(val, 380, 64); disp.needsUpdate = true; }
      // 누르는 키
      keys.forEach((k, i) => { k.position.y = .06; });
      P.forEach((p, i) => { [p.t - .3, p.t - .12].forEach((tk, j) => { const d = t - tk; if (d > 0 && d < .1) keys[(i * 5 + j * 7) % keys.length].position.y = .045; }); });
      // 숫자 판: 계산기에서 튀어나와 자리로
      panels.forEach(({ b, p, spot, big }) => {
        const s = t - p.t; b.visible = s > 0; if (!b.visible) return;
        const u = eo(clamp(s / .28)), from = V(.14, .85, .25), to = V(spot[0], spot[1], .2);
        b.position.lerpVectors(from, to, u); b.position.y += Math.sin(Math.PI * clamp(s / .28)) * .15;
        const gone = big ? 1 : 1 - ss(seg(t, 3.65, 3.8));
        b.scale.setScalar(Math.max(.001, pop(s, 7, 16) * gone) * (big ? 1 + .06 * Math.sin(t * 9) * (s > .6 ? 1 : 0) : 1)); if (gone < .01) b.visible = false;
        b.rotation.set(0, 0, (1 - u) * .5);
      });
      // 다람쥐: 계산 (오른팔 두드리기) → 27시간에 뒤로 넘어질 듯 → 축 처짐
      let tap = 0; P.forEach(p => { [p.t - .3, p.t - .12].forEach(tk => { const d = t - tk; if (d > -.08 && d < .1) tap = Math.max(tap, 1 - Math.abs(d) / .1); }); });
      const shock = ss(seg(t, 3.75, 3.9)), back = t > 3.75 ? Math.exp(-(t - 3.75) * 3) * Math.sin((t - 3.75) * 9) : 0, slump = ss(seg(t, 4.6, 5.2));
      sq.pose({
        armR: [lerp(1.25 - tap * .35, 2.4, shock), lerp(.15, .9, shock)], armL: [lerp(1.1, 2.4, shock), lerp(.2, .9, shock) - slump * .6],
        lean: -.35 * back - .12 * shock + .18 * slump, eye: 1 + .5 * shock - .15 * slump, mouth: lerp(1.05, 2.4, shock) - .6 * slump, ear: lerp(-.1, -.5, shock) + 1.4 * slump,
        jump: back * .06, headNod: .15 * (1 - shock) + .25 * slump, headTilt: Math.sin(t * 7) * .05 * (1 - shock) + .15 * slump, lid: .35 * slump, sweat: slump * ((t * 1.4) % 1), tailPuff: 1 + .35 * shock * (1 - slump),
      });
      sq.root.rotation.y = 0;
    },
  };
}

// ———————————————— 컷 3: 이사 (×40 → ×1), 막대그래프 ————————————————
const COMPANY = { x: 27.5, z: -20, w: 13, d: 24, h: 30 }, HOME = { x: 13.75, z: -12.4, w: 9, d: 9, h: 13 };
function heroBuildings(root, R) {
  const comp = building(COMPANY.w, COMPANY.d, COMPANY.h, R, { wall: '#9fc3e0', shop: '#1b2f5c' }); comp.position.set(COMPANY.x, .18, COMPANY.z); root.add(comp);
  const cs = signBoard(9, 2.6, PROPS.office, { bg: '#1b2f5c', fg: '#ffffff', fs: [.62], edge: '#13244a', d: .4, px: 60 }); cs.position.set(COMPANY.x, COMPANY.h + 2.0, COMPANY.z + COMPANY.d / 2 - 2); comp.add(cs); cs.position.set(0, COMPANY.h + 1.8, COMPANY.d / 2 - 2.5);
  const home = building(HOME.w, HOME.d, HOME.h, R, { wall: '#f6e3c4', shop: null }); home.position.set(HOME.x, .18, HOME.z); root.add(home);
  const hs = signBoard(5.6, 1.7, PROPS.home, { bg: '#ffd23f', fg: '#1b2f5c', fs: [.6], edge: '#e0b420', d: .3, px: 60 }); hs.position.set(0, HOME.h + 1.4, HOME.d / 2 - 1.5); home.add(hs);
  return { comp, home };
}
const PATH = [[-24, 6.4], [-6.2, 6.4], [6.2, 6.4], [6.2, -12.4], [8.7, -12.4]];
function pathAt(u) {
  const L = []; let tot = 0; for (let i = 1; i < PATH.length; i++) { const l = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); L.push(l); tot += l; }
  let s = clamp(u) * tot; for (let i = 0; i < L.length; i++) { if (s <= L[i] || i === L.length - 1) { const k = clamp(s / L[i]); const a = PATH[i], b = PATH[i + 1]; return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) }; } s -= L[i]; }
}
function cut3(scene) {
  const R = mulberry(9), EV = [];
  const town = buildTown(scene, { seed: 41, residential: (x, z) => x < 0, special: [{ x: 20, z: 20, kind: 'park', clear: [13, 13, 9] }], skip: [[COMPANY.x, COMPANY.z - 7.75], [COMPANY.x, COMPANY.z + 7.75], [HOME.x, HOME.z]] });
  heroBuildings(town.root, R);
  const cars = makeCars(town.root, 30, 12), walkers = makeWalkers(town.root, 70, 13);
  // 막대그래프 (공원 광장)
  const bars = [[PROPS.bar1, 40.2, '#f08c3a', 9.5], [PROPS.bar2, 17.8, '#9aa3ad', 16.5]].map(([lab, v, col, x], i) => {
    const h = v * .28;
    const b = grp(box(4.2, 1, 4.2, M(col, { roughness: .45 }), 0, .5, 0)); b.position.set(x, .4, 13); town.root.add(b);
    const s = signBoard(6.2, 2.8, lab, { bg: i ? '#ffffff' : '#1b2f5c', fg: i ? '#1b2f5c' : '#ffffff', fg2: i ? '#6b7480' : '#ffd23f', fs: [.38, .48], edge: '#c9ced6', d: .25, px: 70 });
    town.root.add(s);
    return { b, s, h, x, t0: 4.5 + i * .5 };
  });
  const pad = box(16, .3, 9, '#e9e3d6', 13, .3, 13); pad.castShadow = false; town.root.add(pad);
  // 다람쥐 + 상자
  const sq = makeSquirrel(); const SC = 1.6; sq.root.scale.setScalar(SC); town.root.add(sq.root);
  const crate = grp(box(1.3, 1.0, 1.0, '#c99a62', 0, .5, 0), box(1.32, .12, .3, '#e8d2a8', 0, 1.0, 0)); town.root.add(crate);
  EV.push({ t: 0, type: 'amb', what: 'lapse', d: 4.0 }, { t: 4.0, type: 'thud' }, { t: 4.0, type: 'realtime' }, { t: 4.0, type: 'amb', what: 'city', d: 5 },
    { t: 4.5, type: 'swoosh', n: 0 }, { t: 5.0, type: 'swoosh', n: 1 });
  for (let k = 0; k < 32; k++) EV.push({ t: k / 8, type: 'tick' });
  const SEG = [[0, 40], [4.0, 1]];
  const ARRIVE = 3.75;
  return {
    W: town.root, EV, dur: 9, sky: ['#9fd0f0', '#e9f5fb'],
    cam(t) {
      const u = ss(seg(t, 0, 9)), push = eio(seg(t, 4.3, 9));
      const look = [lerp(-6, 4, ss(seg(t, 0, 4.5))) + push * 4, 0, lerp(-1, 0, u) + push * 3];
      const pos = [look[0] + lerp(-4, 2, u), lerp(92, 74, push), look[2] + lerp(84, 66, push)];
      const p = pathAt(seg(t, 0, ARRIVE));
      const at = t < 4.4 ? [p.x, 2.5, p.z] : [13, lerp(2.5, 6, ss(seg(t, 4.4, 5.2))), lerp(-2, 13, ss(seg(t, 4.4, 5.2)))];
      return { pos, look, fov: 30, near: 1, far: 1500, focus: V(...pos).distanceTo(V(...at)), aper: 60, maxCoc: 24, band: { at, w: lerp(.09, .1, push), amp: 26, mix: .65 } };
    },
    sun: t => ({ az: 205, el: 48, target: [0, 0, 0], span: 70 }),
    light(t, { sun, hemi }) { sun.intensity = 3.0; hemi.intensity = 1.0; },
    update(t) {
      const simT = simTime(t, SEG); cars.update(simT); walkers.update(simT);
      // 다람쥐: ×40 동안 끊기며 이동 (8Hz)
      const ts = stepT(t, t < 4.0), u = seg(ts, 0, ARRIVE), p = pathAt(u);
      const walking = t < ARRIVE, bob = walking ? Math.abs(Math.sin(ts * 14)) * .12 : 0;
      sq.root.position.set(p.x, .18, p.z); sq.root.rotation.y = walking ? p.yaw : lerp(p.yaw, .6, ss(seg(t, 4.2, 4.8)));
      const put = ss(seg(t, ARRIVE, 4.0)), relief = ss(seg(t, 4.2, 4.6));
      sq.pose({ jump: bob, squash: 1 - put * .15 * (1 - relief), armL: [lerp(1.2, .4, put) + relief * .3, lerp(.35, .2, put) + relief * 2.3], armR: [lerp(1.2, .4, put) + relief * .3, lerp(.35, .2, put) + relief * 2.3],
        lean: lerp(.1, .3, put) * (1 - relief) - relief * .1, mouth: 1.1 + relief * .6, eye: 1 + relief * .15, lid: walking ? .2 : 0, tailSway: Math.sin(ts * 9) * .15, headNod: walking ? .1 : 0 });
      // 상자: 손에 들고 → 내려놓기 (문 앞)
      const fwd = V(Math.sin(sq.root.rotation.y), 0, Math.cos(sq.root.rotation.y));
      if (t < ARRIVE) crate.position.set(p.x + fwd.x * 1.0, .18 + 1.25 * SC * .62 + bob, p.z + fwd.z * 1.0);
      else { const k = ei(seg(t, ARRIVE, 4.0)); crate.position.set(p.x + fwd.x * 1.2, lerp(.18 + 1.25 * SC * .62, .18, k), p.z + fwd.z * 1.2); }
      crate.rotation.y = sq.root.rotation.y;
      // 막대 상승 (슈욱)
      bars.forEach(B => { const s = t - B.t0, k = s <= 0 ? 0 : (s < .5 ? eo(s / .5) : 1 + .04 * Math.exp(-(s - .5) * 6) * Math.sin((s - .5) * 14)); const h = Math.max(.01, B.h * k);
        B.b.scale.set(1, h, 1); B.b.visible = s > 0; B.s.visible = s > .15; B.s.position.set(B.x, .4 + h + 2.0, 13); B.s.lookAt(B.s.position.x, B.s.position.y + 30, B.s.position.z + 40); B.s.scale.setScalar(Math.max(.001, pop(s - .15))); });
    },
  };
}

// ———————————————— 컷 4: 한 걸음 거리, 벤치에서 커피 ————————————————
function cut4(scene) {
  const R = mulberry(9), EV = [];
  const town = buildTown(scene, { seed: 41, residential: (x, z) => x < 0, special: [{ x: 20, z: 20, kind: 'park', clear: [0, 0, 0] }], skip: [[COMPANY.x, COMPANY.z - 7.75], [COMPANY.x, COMPANY.z + 7.75], [HOME.x, HOME.z]] });
  const HB = heroBuildings(town.root, R); HB.home.children[HB.home.children.length - 1].visible = false;
  const cars = makeCars(town.root, 30, 12, (road, ax) => !(road === 0 && ax === 'x')), walkers = makeWalkers(town.root, 70, 13);
  // 두 건물 사이 한 걸음: 발자국 + 도보 1분 표지
  const foot = [];
  for (let i = 0; i < 6; i++) { const f = mesh(new THREE.CircleGeometry(.32, 16), M('#ffffff'), 18.3 + i * .55, .2, -7.2 + (i % 2) * .5); f.rotation.x = -Math.PI / 2; f.castShadow = false; f.scale.set(.7, 1.3, 1); town.root.add(f); foot.push(f); }
  const ws = grp(cyl(.08, .08, 1.4, 12, '#6b7480', 0, .7, 0)); const wsb = signBoard(2.6, .85, PROPS.walk, { bg: '#1f9e5c', fg: '#ffffff', fs: [.62], edge: '#16804a', d: .12, px: 80 }); wsb.position.y = 1.7; ws.add(wsb); ws.position.set(21.6, .18, -2.3); ws.rotation.y = -.15; town.root.add(ws);
  // 벤치 + 다람쥐 + 커피
  const bench = grp(box(3.2, .12, .9, '#a8784e', 0, .62, 0), box(3.2, .7, .12, '#a8784e', 0, 1.05, -.42), box(.15, .6, .7, '#4a4f58', -1.3, .3, 0), box(.15, .6, .7, '#4a4f58', 1.3, .3, 0));
  bench.position.set(19.6, .18, -3.6); town.root.add(bench);
  const sq = makeSquirrel(); const SC = 1.25; sq.root.scale.setScalar(SC); sq.root.position.set(19.6, .5, -3.7); town.root.add(sq.root);
  const cup = grp(cyl(.22, .17, .5, 16, '#ffffff', 0, 0, 0), cyl(.225, .2, .18, 16, '#a0603c', 0, -.02, 0), cyl(.23, .23, .06, 16, '#3a3f48', 0, .27, 0));
  sq.arms[0].a.add(cup); cup.position.set(.06, -.3, .16); cup.scale.setScalar(.55);
  EV.push({ t: .25, type: 'ting' }, { t: 0, type: 'amb', what: 'city', d: 6 }, { t: 6.0, type: 'speedup' }, { t: 6.0, type: 'amb', what: 'lapse', d: 2 }, { t: 7.55, type: 'doorClose' });
  for (let k = 48; k < 64; k++) EV.push({ t: k / 8, type: 'tick' });
  [1.4, 4.2].forEach(t => EV.push({ t: t + .45, type: 'sip' }));
  const SEG = [[0, 1], [6.0, 40]];
  return {
    W: town.root, EV, dur: 8, sky: ['#a9d8f5', '#eaf6fb'],
    cam(t) {
      const u = ss(seg(t, 0, 8)), az = lerp(-.3, .02, u), dist = lerp(27, 24, u), el = 36 * Math.PI / 180;
      const look = [19.8, 1.0, -5.6];
      const pos = [look[0] + Math.sin(az) * Math.cos(el) * dist, look[1] + Math.sin(el) * dist, look[2] + Math.cos(az) * Math.cos(el) * dist];
      return { pos, look, fov: 30, near: 1, far: 1500, focus: dist, aper: 45, maxCoc: 24, band: { at: [19.6, 1.6, -3.7], w: .12, amp: 26, mix: .65 } };
    },
    sun: t => ({ az: 215, el: 50, target: [19, 0, -6], span: 40 }),
    light(t, { sun, hemi }) { sun.intensity = 3.0; hemi.intensity = 1.0; },
    update(t) {
      const simT = simTime(t, SEG); cars.update(simT); walkers.update(simT);
      const sip = Math.max(env(t, 1.4, 2.5, .3, .35), env(t, 4.2, 5.3, .3, .35)), real = ss(seg(t, 7.2, 7.35));
      const relax = 1 - real, ft = stepT(t, t > 6.0);
      sq.pose({
        armL: [lerp(.95, 2.55, sip), lerp(.25, -.35, sip)], armR: [lerp(.5, .3, real), lerp(.2, 2.0, real)],
        lid: lerp(.5, 0, real) * (1 - sip * .3), eye: 1 + real * .5, mouth: lerp(.9, 2.2, real), ear: lerp(-.2, -.5, real), headNod: lerp(.08, -.1, real) - sip * .15, headTilt: Math.sin(ft * 1.6) * .1 * relax,
        tailSway: Math.sin(ft * 3) * .12, tailPuff: 1 + .3 * real, jump: real > 0 ? Math.exp(-(t - 7.2) * 6) * .25 * real : 0,
      });
      sq.root.rotation.y = .1;
      foot.forEach((f, i) => { f.visible = t > .6 + i * .12; });
    },
  };
}

function cut0(scene) {
  const W = new THREE.Group(); scene.add(W);
  const sq = makeSquirrel(); W.add(sq.root);
  const QS = new URLSearchParams(location.search), yaw = +(QS.get('yaw') || 0);
  return { W, EV: [], dur: 1, sky: ['#ffffff', '#ffffff'],
    cam: t => ({ pos: [Math.sin(yaw) * 9, 1.15, Math.cos(yaw) * 9], look: [0, 1.05, 0], fov: 18, focus: 9, aper: 0, maxCoc: 0, band: { w: 1, amp: 0, mix: 0 } }),
    sun: t => ({ az: 20, el: 50, target: [0, 1, 0], span: 3 }), light(t, { sun, hemi }) { sun.intensity = 1.6; hemi.intensity = 1.6; },
    update(t) { sq.pose({}); sq.root.rotation.y = 0; } };
}
export const BUILD = { 0: cut0, 1: cut1, 2: cut2, 3: cut3, 4: cut4 };
