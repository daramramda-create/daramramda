// 컷 4개의 세계, 동작, 카메라. 각 컷은 t=0부터.
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, ei, lerp, monotone } from '/core/lib.js';
import { M, mesh, box, cyl, ico, prism, grp, island, pop, riseY, drop, applySquash, labelBoard, canvasTex, texMat, puffRing } from './lib3d.js';
import { makeSquirrel, makeOwl } from './squirrel.js';
import { PROPS, CUTS } from './story.js';

const DEG = Math.PI / 180;
const K = keys => monotone(keys);
const env = (t, a, b, fi = .15, fo = .15) => Math.min(ss(seg(t, a, a + fi)), 1 - ss(seg(t, b - fo, b)));
// 팝 등장 (s<0이면 숨김)
function popIn(o, t, t0, base = 1) { const s = t - t0; o.visible = s > 0; const k = Math.max(.001, pop(s)); o.scale.setScalar(base * k); }
function riseIn(o, t, t0, y0 = 0, depth = 2) { const s = t - t0; o.visible = s > 0; o.position.y = y0 + riseY(s, depth); }
function dropIn(o, t, t0, y0 = 0, h = 3, base = 1) { const s = t - t0; o.visible = s > 0; const d = drop(s, h); o.position.y = y0 + d.y; applySquash(o, d.sy, base); }
const faceCam = az => az * DEG;

// 섬 타일을 고리별로 솟게 한다
function riseTiles(tiles, t, times) { tiles.forEach(T => { const t0 = times[Math.min(T.ring, times.length - 1)] + (T.i % 3) * .0; T.obj.visible = t > t0; T.obj.position.y = riseY(t - t0, 1.6); }); }

// —————————————————— 컷 1: 넓은 거실, 신난 다람쥐 ——————————————————
function cut1(scene) {
  const W = new THREE.Group(); scene.add(W);
  const isl = island(2, { top: '#ecd0a4', side: '#c99e6c', rock: '#b9a7d4' }, 3); W.add(isl.g);
  const EV = [];
  const ringT = [0, .25, .5];
  ringT.forEach((t, i) => EV.push({ t, type: 'tile', n: i }));
  // 소품
  const rug = cyl(1.55, 1.55, .04, 6, '#f6b9b0', .2, .02, .5); W.add(rug);
  const sofa = grp(box(2.1, .42, .85, '#8fc7c0', 0, .3, 0), box(2.1, .7, .24, '#7fb8b1', 0, .66, -.33), box(.24, .55, .85, '#7fb8b1', -1.1, .38, 0), box(.24, .55, .85, '#7fb8b1', 1.1, .38, 0),
    box(.5, .4, .14, '#ffd98a', -.55, .7, -.15), box(.5, .4, .14, '#f6b9b0', .55, .7, -.15));
  sofa.position.set(-1.55, 0, -1.55); sofa.rotation.y = .5; W.add(sofa);
  const win = grp(box(3.0, 2.5, .16, '#fdf1e2', 0, 1.25, 0),
    mesh(new THREE.BoxGeometry(2.0, 1.4, .05), M('#bfe3f5', { emissive: '#bfe3f5', emissiveIntensity: .35 }), 0, 1.45, .07),
    box(2.2, .1, .12, '#ffffff', 0, .72, .1), box(2.2, .1, .12, '#ffffff', 0, 2.18, .1), box(.1, 1.5, .12, '#ffffff', -1.05, 1.45, .1), box(.1, 1.5, .12, '#ffffff', 1.05, 1.45, .1), box(.06, 1.4, .1, '#ffffff', 0, 1.45, .1),
    box(.35, 1.9, .1, '#f4a6a0', -1.35, 1.3, .14), box(.35, 1.9, .1, '#f4a6a0', 1.35, 1.3, .14));
  win.position.set(1.1, 0, -2.45); win.rotation.y = -.2; W.add(win);
  const lamp = grp(cyl(.28, .32, .08, 6, '#8a7a6a', 0, .04, 0), cyl(.04, .04, 1.5, 5, '#8a7a6a', 0, .8, 0), mesh(new THREE.CylinderGeometry(.22, .42, .45, 6), M('#ffe2a0', { emissive: '#ffd27a', emissiveIntensity: .5 }), 0, 1.62, 0));
  lamp.position.set(2.75, 0, -.7); W.add(lamp);
  const plant = grp(cyl(.3, .22, .45, 6, '#d98f6f', 0, .22, 0), ico(.42, 0, '#8cc47a', 0, .8, 0), ico(.3, 0, '#a5d48e', .2, 1.12, .05), ico(.24, 0, '#7db86c', -.18, 1.05, -.1));
  plant.position.set(-2.75, 0, .7); W.add(plant);
  const sign = grp(cyl(.05, .05, 1.0, 5, '#a8784e', 0, .5, 0)); const sb = labelBoard(1.05, .55, PROPS.price, { bg: '#ffe36e', fg: '#e0503c', edge: '#e8b84a' }); sb.position.y = 1.15; sign.add(sb);
  sign.position.set(1.75, 0, 1.55); W.add(sign);
  const puffs = [puffRing(8, 1.0), puffRing(8, .8)]; puffs[0].position.set(0, 0, .4); W.add(...puffs);
  const props = [[rug, .75], [sofa, 1.0], [win, 1.25], [lamp, 2.25], [plant, 2.5], [sign, 3.0]];
  props.forEach(([o, t], i) => EV.push({ t, type: 'pop', n: 3 + i, big: o === win || o === sofa }));
  const sq = makeSquirrel(); sq.root.position.set(0, 0, .45); W.add(sq.root);
  EV.push({ t: 1.0, type: 'crouch' }, { t: 1.25, type: 'jump' }, { t: 1.85, type: 'land' }, { t: 1.85, type: 'bubble' });
  const cA = K([[0, 34], [3.0, 44], [4, 45]]), cF = K([[0, 5.6], [.25, 5.7], [2.6, 9.4], [4, 9.8]]), cY = K([[0, 1.45], [2.6, 1.0], [4, 1.0]]);
  return {
    W, EV, dur: 4, sky: { zen: '#c9b8f0', hor: '#ffdccb' }, sun: { az: 60, el: 52 },
    cam: t => ({ tg: [0, cY(t), .1], az: cA(t), el: 29, fh: cF(t), oy: -.075 }),
    update(t, C) {
      riseTiles(isl.tiles, t, ringT);
      props.forEach(([o, t0]) => popIn(o, t, t0));
      puffs[0].userData.set(t - 1.85);
      // 다람쥐: 들썩이는 대기 → 웅크림 → 점프(두 팔 활짝) → 착지
      const bob = Math.abs(Math.sin(t * Math.PI * 2)) * .14 * (1 - seg(t, .9, 1.0));
      const crouch = ss(seg(t, 1.0, 1.22)) * (1 - seg(t, 1.22, 1.28));
      const air = t > 1.25 && t < 1.85 ? Math.sin(Math.PI * (t - 1.25) / .6) : 0;
      const land = t >= 1.85 ? Math.exp(-(t - 1.85) * 7) * Math.cos((t - 1.85) * 20) : 0;
      const open = ss(seg(t, 1.2, 1.4));
      const wig = Math.sin(t * 14) * .25 * open;
      const hops = t > 2.25 ? Math.abs(Math.sin((t - 2.25) * Math.PI * 2)) * .3 : 0;   // 신나서 박자마다 콩콩
      const spin = ss(seg(t, 1.3, 1.8)) * Math.PI * 2;
      sq.pose({
        jump: bob + air * 1.25 + hops, squash: 1 - crouch * .38 + air * .28 - land * .4 + (hops > 0 ? (.3 - hops) * .25 : 0),
        armL: [lerp(.35, .2, open), lerp(.6, 2.55, open) + wig], armR: [lerp(.35, .2, open), lerp(.6, 2.55, open) - wig],
        mouth: lerp(1.2, 1.9, open), eye: 1 + air * .3 + open * .1, ear: -.3 * open, headTilt: Math.sin(t * 7) * .16 * open, tailSway: Math.sin(t * 9) * .2 - air * .35, tailPuff: 1 + .12 * open,
      });
      sq.root.rotation.y = faceCam(C.az) - .1 + spin;
      sign.rotation.y = faceCam(C.az) - .35;
    },
    anchors: { sq: sq.anchors.headTop },
  };
}

// —————————————————— 컷 2: 은행 창구 ——————————————————
function cut2(scene) {
  const W = new THREE.Group(); scene.add(W);
  const isl = island(2, { top: '#dfe3ec', side: '#aab3c4', rock: '#b8b2cf' }, 7); W.add(isl.g);
  const EV = [{ t: 0, type: 'tile', n: 0 }];
  const wall = grp(box(5.2, 3.4, .2, '#eef1f7', 0, 1.7, 0), box(5.2, .25, .26, '#c9d2e3', 0, .12, 0));
  const bank = labelBoard(2.4, .62, PROPS.bank, { bg: '#3f5a85', fg: '#ffffff', edge: '#2f4568' }); bank.position.set(1.15, 2.85, .14); wall.add(bank);
  wall.position.set(0, 0, -2.3); W.add(wall);
  // 창구: z 방향으로 긴 카운터, 직원은 왼쪽(-x), 다람쥐는 오른쪽(+x)
  const counter = grp(box(1.0, 1.15, 3.6, '#f3efe6', 0, .575, 0), box(1.25, .1, 3.8, '#b98a5e', 0, 1.2, 0),
    mesh(new THREE.BoxGeometry(.05, .95, 3.6), M('#cfe8f5', { transparent: true, opacity: .18, roughness: .2 }), -.2, 1.73, 0));
  const desk = labelBoard(.95, .3, PROPS.desk, { bg: '#ffffff', fg: '#3f5a85', edge: '#c9d2e3' }); desk.position.set(.4, 1.42, -1.45); desk.rotation.y = Math.PI / 2 - .5; counter.add(desk);
  counter.position.set(-.1, 0, -.3); W.add(counter);
  const siren = grp(cyl(.2, .22, .12, 6, '#5d5d6b', 0, .06, 0));
  const domeM = M('#e4473f', { emissive: '#ff2a1a', emissiveIntensity: 0, unique: true });
  const dome = mesh(new THREE.IcosahedronGeometry(.2, 0), domeM, 0, .24, 0); siren.add(dome);
  const sl = new THREE.PointLight('#ff4030', 0, 3.2, 2); sl.position.y = .4; siren.add(sl);
  siren.position.set(-.1, 1.25, .9); W.add(siren);
  const owl = makeOwl(); owl.root.position.set(-1.35, 0, -.2); owl.root.rotation.y = Math.PI / 2 - .85; W.add(owl.root);
  const sq = makeSquirrel(); sq.root.position.set(1.35, 0, .5); sq.root.rotation.y = -Math.PI / 2 + .6; W.add(sq.root);
  const doc = labelBoard(.62, .8, PROPS.docs.replace(' ', '\n'), { bg: '#ffffff', fg: '#3a3a4a', edge: '#e3e3ea', d: .03, font: '"Jua"' }); W.add(doc);
  EV.push({ t: .25, type: 'pop', n: 2 }, { t: .5, type: 'pop', n: 3 }, { t: .75, type: 'paper' }, { t: 1.0, type: 'bubble' }, { t: 2.6, type: 'cut' });
  for (let k = 0; k < 6; k++) EV.push({ t: 2.75 + k * .25 + .125, type: 'wood', n: k });
  EV.push({ t: 3.0, type: 'siren', d: 5 }, { t: 4.5, type: 'gap' }, { t: 4.75, type: 'cut' }, { t: 4.75, type: 'shock' }, { t: 4.75, type: 'bubble' });
  const shot = t => t < 2.6 ? 'A' : t < 4.75 ? 'B' : 'C';
  return {
    W, EV, dur: 8, sky: { zen: '#a9b9de', hor: '#e8ecf4' }, sun: { az: 40, el: 55 },
    shot,
    cam(t) {
      const s = shot(t);
      if (s === 'A') return { tg: [0, 1.25, -.1], az: lerp(8, 14, seg(t, 0, 2.6)), el: 27, fh: 8.6, oy: 0 };
      if (s === 'B') { const u = eo(seg(t, 2.6, 4.75)); return { tg: [-1.2, 1.9, -.1], az: 0, el: 20, fh: lerp(4.4, 3.9, u), oy: .02 }; }
      const u = seg(t, 4.75, 8); return { tg: [lerp(1.2, 1.35, u), 1.75, .45], az: lerp(-26, -18, u), el: 17, fh: lerp(4.7, 4.4, ss(u)), oy: .03 };
    },
    update(t, C) {
      riseTiles(isl.tiles, t, [0, 0, 0]);
      popIn(wall, t, .25); riseIn(counter, t, .5, 0, 1.6); bank.visible = t < 2.6;
      // 서류: 다람쥐 손 → 카운터 위로 미끄러짐
      const k = ss(seg(t, .75, 1.05));
      doc.visible = true;
      doc.position.set(lerp(.8, .05, k), lerp(1.45, 1.27, k), lerp(.7, .55, k));
      doc.rotation.set(lerp(-.2, -Math.PI / 2, k), lerp(-Math.PI / 2 + .6, -Math.PI / 2, k), 0);
      // 경광등
      const on = t > 3.0, fl = on ? .5 + .5 * Math.cos((t - 3.0) * Math.PI * 4) : 0;
      domeM.emissiveIntensity = on ? .6 + fl * 1.8 : 0; sl.intensity = on ? .6 + fl * 3.2 : 0; dome.rotation.y = t * 6;
      // 직원: 서류 받기 → 말하기 → 고개 젓기
      const shake = t > 2.75 && t < 4.25 ? Math.sin((t - 2.75) * Math.PI * 4) * 1.0 * env(t, 2.75, 4.25, .08, .25) : 0;
      const cross = env(t, 3.0, 4.6, .15, .25);
      owl.pose({ turn: shake, nod: lerp(0, .18, ss(seg(t, 1.0, 1.4))) + Math.sin(t * 9) * .08 * env(t, 1.0, 2.6), sad: ss(seg(t, 2.4, 2.7)) * 1.4, tilt: -.15 * ss(seg(t, 2.4, 2.8)) + shake * .2, wing: .9 * env(t, .9, 1.6) + 1.3 * cross, cross, sway: -shake * .12, hop: Math.abs(Math.sin(t * Math.PI * 4)) * .05 * cross });
      // 다람쥐: 기대 → 움찔 → 충격
      const hop = Math.abs(Math.sin(t * Math.PI * 2)) * .2 * (1 - seg(t, 2.4, 2.6));
      const flinch = t > 3.0 ? Math.exp(-(t - 3.0) * 6) * Math.sin((t - 3.0) * 22) : 0;
      const fj = t > 3.0 && t < 3.35 ? Math.sin(Math.PI * (t - 3.0) / .35) * .45 : 0;   // 경광등에 깜짝 점프
      const shock = ss(seg(t, 4.75, 4.95)), stiff = t > 4.75 ? Math.exp(-(t - 4.75) * 6) * Math.cos((t - 4.75) * 20) : 0;
      const tremble = Math.sin(t * 70) * .035 * shock;
      const give = env(t, .2, 1.0, .2, .2);
      sq.pose({
        jump: hop + fj, squash: 1 - flinch * .2 + fj * .25 - shock * .1 + stiff * .25 + give * .08,
        armL: [lerp(lerp(.4, 1.5, give), 2.3, shock), lerp(lerp(.2, .1, give), .45, shock) + tremble * 4], armR: [lerp(lerp(.4, 1.5, give), 2.3, shock), lerp(lerp(.2, .1, give), .45, shock) - tremble * 4],
        ear: lerp(-.35 * (fj > 0 ? 1 : 0), 1.25, shock), eye: 1 + .5 * shock + fj * .5, mouth: lerp(1.15 + fj, 2.5, shock), lean: -.2 * shock + tremble, headTilt: .2 * shock + tremble * 2, sweat: shock * ((t * 1.6) % 1),
        tailSway: Math.sin(t * 6) * .1, tailPuff: 1 + .25 * shock + fj * .4,
      });
    },
    anchors: { sq: sq.anchors.headTop, clerk: owl.anchors.headTop },
  };
}

// —————————————————— 컷 3: 건축물대장 도장 → 빌라의 정체 ——————————————————
function ledgerTex() {
  const cw = 1040, ch = 1280;
  return canvasTex(cw, ch, g => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, cw, ch);
    g.strokeStyle = '#8a7b6a'; g.lineWidth = 6; g.strokeRect(40, 40, cw - 80, ch - 80);
    g.fillStyle = '#3e3328'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '400 112px "Black Han Sans"'; g.fillText(PROPS.ledgerTitle, cw / 2, 170);
    g.lineWidth = 4;
    PROPS.ledgerRows.forEach(([k, v], i) => {
      const y = 300 + i * 220; g.strokeRect(80, y, cw - 160, 200); g.beginPath(); g.moveTo(340, y); g.lineTo(340, y + 200); g.stroke();
      g.fillStyle = k === '용도' ? '#fde3c0' : '#f1e8da'; g.fillRect(82, y + 2, 256, 196);
      g.fillStyle = '#3e3328'; g.font = '400 64px "Jua"'; g.fillText(k, 210, y + 102);
      g.font = '400 54px "Jua"'; g.fillText(v, 340 + (cw - 420) / 2, y + 102);
    });
  });
}
function cut3(scene) {
  const W = new THREE.Group(); scene.add(W);
  const isl = island(2, { top: '#c5e3bd', side: '#9cbf8f', rock: '#c4b4d6' }, 11); W.add(isl.g);
  const EV = [];
  // 건축물대장 판: 캔버스 1040×1280 → 2.6×3.2 단위
  const LW = 2.6, LD = 3.2;
  const tex = ledgerTex();
  const ledger = new THREE.Mesh(new THREE.BoxGeometry(LW, .1, LD), [M('#e8dcc8'), M('#e8dcc8'), texMat(tex), M('#e8dcc8'), M('#e8dcc8'), M('#e8dcc8')]);
  ledger.castShadow = ledger.receiveShadow = true;
  const LZ = 1.55; ledger.position.set(0, .05, LZ); ledger.rotation.y = 0; W.add(ledger);
  // '용도' 칸 값 영역 중심: 캔버스 (340+(1040-420)/2 = 650, 300+2*220+100 = 840)
  const cell = [(650 / 1040 - .5) * LW, .11, LZ + (840 / 1280 - .5) * LD];
  const stampTex = canvasTex(1024, 360, g => {
    g.clearRect(0, 0, 1024, 360); g.strokeStyle = '#d8332f'; g.lineWidth = 16; g.strokeRect(16, 16, 992, 328);
    g.fillStyle = '#d8332f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '400 138px "Black Han Sans"'; g.fillText('제2종 근린생활시설', 512, 186);
  });
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.56, .55), new THREE.MeshBasicMaterial({ map: stampTex, transparent: true, depthWrite: false, toneMapped: false }));
  decal.rotation.x = -Math.PI / 2; decal.position.set(...cell); decal.position.y = .111; W.add(decal);
  const stamp = grp(box(1.7, .32, .66, '#b23a33', 0, .16, 0), box(1.5, .5, .5, '#6b4a36', 0, .55, 0), cyl(.16, .2, .8, 6, '#6b4a36', 0, 1.15, 0), ico(.3, 0, '#e4b77a', 0, 1.6, 0));
  W.add(stamp);
  // 빌라 (4층): 2~4층 주택 + 1층 앞면 덮개 (주택처럼 보이는)
  const villa = new THREE.Group(); villa.position.set(.3, 0, -1.55); W.add(villa);
  const FH = .78, BW = 2.5, BD = 1.9;
  villa.add(box(BW, FH, BD, '#d9d2c6', 0, FH / 2, 0));   // 1층 몸체 (회색, 원래 상가)
  for (let f = 1; f < 4; f++) {
    villa.add(box(BW, FH, BD, '#f6ead8', 0, FH * f + FH / 2, 0));
    villa.add(box(BW + .06, .06, BD + .06, '#e6d2b8', 0, FH * f, 0));
    [-.75, 0, .75].forEach(x => villa.add(mesh(new THREE.BoxGeometry(.42, .42, .06), M('#9fc9e3', { emissive: '#9fc9e3', emissiveIntensity: .2 }), x, FH * f + FH / 2, BD / 2 + .02)));
    villa.add(box(.9, .07, .3, '#e6d2b8', -.75, FH * f + .14, BD / 2 + .15));
  }
  villa.add(box(BW + .1, .18, BD + .1, '#e6d2b8', 0, FH * 4 + .09, 0));
  // 1층 상가 정면 (덮개 아래 숨어 있음)
  const shopGlass = mesh(new THREE.BoxGeometry(2.2, .58, .05), M('#ffe6a8', { emissive: '#ffd27a', emissiveIntensity: .7 }), 0, .34, BD / 2 + .01); villa.add(shopGlass);
  [-.55, 0, .55].forEach(x => villa.add(box(.05, .58, .07, '#7b8794', x, .34, BD / 2 + .03)));
  // 덮개: 위쪽 모서리를 축으로 들린다
  const lid = new THREE.Group(); lid.position.set(0, FH, BD / 2 + .06); villa.add(lid);
  const lidP = grp(box(BW + .04, FH, .1, '#f6ead8', 0, -FH / 2, 0), box(.42, .62, .06, '#a8784e', .6, -FH / 2 - .06, .06), mesh(new THREE.BoxGeometry(.42, .36, .05), M('#9fc9e3'), -.6, -FH / 2 + .02, .06), box(.6, .05, .1, '#e6d2b8', -.6, -FH / 2 - .19, .07));
  lid.add(lidP);
  const awning = grp(); [0, 1, 2, 3, 4, 5].forEach(i => { const b = prism(.4, .12, .4, i % 2 ? '#ffffff' : '#f2796b', -1.0 + i * .4, 0, 0); b.rotation.y = 0; awning.add(b); });
  awning.position.set(0, .7, BD / 2 + .2); villa.add(awning);
  const shopSign = grp(cyl(.05, .05, 1.0, 5, '#7b8794', -.5, .5, 0), cyl(.05, .05, 1.0, 5, '#7b8794', .5, .5, 0));
  const ss_ = labelBoard(1.3, .62, PROPS.shop, { bg: '#f2796b', fg: '#ffffff', edge: '#d65e50' }); ss_.position.y = 1.15; shopSign.add(ss_);
  shopSign.position.set(1.95, 0, -.35); W.add(shopSign);
  const puff = puffRing(9, .9); puff.position.set(1.95, 0, -.35); W.add(puff);
  const sq = makeSquirrel(); sq.root.position.set(-1.45, 0, -.05); sq.root.scale.setScalar(.8); W.add(sq.root);
  EV.push({ t: 0, type: 'tile', n: 0 }, { t: 1.7, type: 'whoosh' }, { t: 1.95, type: 'stamp' }, { t: 3.0, type: 'cut' }, { t: 3.25, type: 'silence', d: .25 },
    { t: 3.5, type: 'lift' }, { t: 3.5, type: 'rise', n: 0, big: true }, { t: 3.75, type: 'pop', n: 4 }, { t: 3.55, type: 'shock' });
  const shot = t => t < 3.0 ? 'A' : 'B';
  const STAMP_T = 1.95, LIFT = 3.5;
  return {
    W, EV, dur: 8, sky: { zen: '#b7a6e0', hor: '#ffd0bf' }, sun: { az: 35, el: 50 }, shot,
    cam(t) {
      if (shot(t) === 'A') {
        const u = eio(seg(t, .3, 1.6)), sh = t > STAMP_T ? Math.exp(-(t - STAMP_T) * 10) * Math.sin((t - STAMP_T) * 60) * .06 : 0;
        return { tg: [lerp(0, cell[0], u) + sh, .1, lerp(LZ, cell[2], u)], az: lerp(6, 0, u), el: 62, fh: lerp(7.6, 3.1, u), oy: 0 };
      }
      const u = seg(t, 3.0, 8);
      return { tg: [lerp(-.05, .2, u), lerp(1.55, 1.35, u), lerp(-.2, -.45, u)], az: lerp(12, 46, u), el: lerp(40, 27, ss(seg(t, 3.0, 4.4))), fh: lerp(9.2, 8.6, u), oy: .01 };
    },
    update(t, C) {
      isl.tiles.forEach(T => { T.obj.visible = true; T.obj.position.y = 0; });
      // 도장: 위에서 낙하 → 쾅 → 다시 들림
      const sd = drop(t - 1.7, 3.2, .25), lift = ss(seg(t, 2.2, 2.5));
      stamp.visible = t > 1.55 && t < 2.55;
      stamp.position.set(cell[0], .1 + sd.y + lift * 2.5, cell[2]);
      applySquash(stamp, t > 1.7 ? sd.sy : 1);
      const ds = t - STAMP_T; decal.visible = ds > 0; decal.scale.setScalar(Math.max(.001, ds > 0 ? 1 + .25 * Math.exp(-ds * 9) * Math.cos(ds * 18) : 0));
      // 덮개 들림, 간판 솟음, 어닝 팝
      const ls = t - LIFT, la = ls <= 0 ? 0 : (ls < .35 ? ei(ls / .35) : 1 + .08 * Math.exp(-(ls - .35) * 7) * Math.sin((ls - .35) * 18));
      lid.rotation.x = -la * 1.62;
      riseIn(shopSign, t, LIFT, 0, 2.2); puff.userData.set(t - LIFT - .22);
      popIn(awning, t, LIFT + .25);
      shopGlass.material.emissiveIntensity = t > LIFT ? .9 : .2;
      // 다람쥐: 3.35 깜짝 → 놀란 채로
      const s = t - LIFT - .05, jmp = s > 0 && s < .5 ? Math.sin(Math.PI * s / .5) * .9 : 0, shock = ss(seg(t, LIFT + .05, LIFT + .18));
      const lnd = s > .5 ? Math.exp(-(s - .5) * 7) * Math.cos((s - .5) * 20) : 0, flail = Math.sin(t * 26) * .45 * (s > 0 && s < .6 ? 1 : 0), tr = Math.sin(t * 70) * .03 * shock;
      sq.pose({ jump: jmp, squash: 1 + jmp * .3 - lnd * .3 - (s < 0 ? ss(seg(t, 3.0, 3.4)) * .08 : 0), ear: -.45 * shock, eye: 1 + .6 * shock, mouth: lerp(1, 2.6, shock), armL: [lerp(.3, 2.2, shock), lerp(.2, 1.2, shock) + flail], armR: [lerp(.3, 2.2, shock), lerp(.2, 1.2, shock) - flail], lean: -.22 * shock + tr, headTilt: tr * 3, tailSway: Math.sin(t * 5) * .05 + .25 * shock, tailPuff: 1 + .35 * shock });
      sq.root.rotation.y = faceCam(C.az) + .35;
      shopSign.rotation.y = faceCam(C.az) * .6;
    },
    anchors: { sq: sq.anchors.headTop },
  };
}

// —————————————————— 컷 4: 칠판 앞 설명 ——————————————————
function cut4(scene) {
  const W = new THREE.Group(); scene.add(W);
  const isl = island(2, { top: '#e3c9a0', side: '#c49a6c', rock: '#b5c7e6' }, 5); W.add(isl.g);
  const EV = [{ t: 0, type: 'tile', n: 0 }];
  const BW = 3.6, BH = 2.3;
  const lines = CUTS[4].board, LT = [.5, 3.75, 5.5];
  const boardTex = canvasTex(1440, 920, () => { });
  const drawBoard = t => {
    const { g } = boardTex.userData, cw = 1440, ch = 920;
    g.fillStyle = '#2f5a4a'; g.fillRect(0, 0, cw, ch);
    g.globalAlpha = .06; for (let i = 0; i < 12; i++) { g.fillStyle = '#ffffff'; g.fillRect(80 + i * 110, 60 + (i * 53) % 700, 160, 30); } g.globalAlpha = 1;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    const cols = ['#fffdf3', '#ffb4a8', '#fff2a8'], ys = [190, 440, 700], fs = [112, 150, 92], xs = [150, 0, 150];
    lines.forEach((l, i) => {
      const u = clamp((t - LT[i]) / .8); if (u <= 0) return;
      const txt = l.replace(' ✅', '');
      g.font = `700 ${fs[i]}px "Gaegu"`; const w = g.measureText(txt).width, x = i === 1 ? (cw - w) / 2 : xs[i];
      if (i === 2) chkPos = bpt(Math.min(xs[2] + w + 150, 1300), 690);
      g.save(); g.beginPath(); g.rect(x - 10, ys[i] - fs[i], (w + 20) * u, fs[i] * 2); g.clip();
      g.fillStyle = cols[i]; g.fillText(txt, x, ys[i]); g.restore();
      if (i === 0 && u >= 1) { g.strokeStyle = '#fff2a8'; g.lineWidth = 8; g.beginPath(); g.moveTo(xs[0], ys[0] + 70); g.lineTo(xs[0] + g.measureText('근린생활시설').width, ys[0] + 70); g.stroke(); }
    });
    boardTex.needsUpdate = true;
  };
  const board = grp(box(BW + .3, BH + .3, .16, '#a8784e', 0, 0, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), texMat(boardTex)); face.position.z = .09; face.receiveShadow = true; board.add(face);
  board.add(box(BW, .08, .2, '#a8784e', 0, -BH / 2 - .1, .12), box(.25, .06, .06, '#ffffff', -1.2, -BH / 2 - .03, .16), box(.18, .06, .06, '#ffb4a8', -.9, -BH / 2 - .03, .16));
  const BY = 3.15; board.position.set(.15, BY, -1.3); W.add(board);
  const legs = grp(box(.12, BY, .12, '#8e6340', -BW / 2, BY / 2, -1.36), box(.12, BY, .12, '#8e6340', BW / 2 + .3, BY / 2, -1.36)); W.add(legs);
  // 칠판 좌표 → 세계 좌표
  const bpt = (cx, cy) => new THREE.Vector3(.15 + (cx / 1440 - .5) * BW, BY + (.5 - cy / 920) * BH, -1.3 + .1);
  // 아이콘 선반과 아이콘 블록
  const table = grp(box(2.5, .55, .9, '#c49a6c', 0, .275, 0), box(2.6, .08, 1.0, '#a8784e', 0, .58, 0)); table.position.set(1.0, 0, .55); W.add(table);
  const lbl = (txt, bg) => { const b = labelBoard(.62, .24, txt, { bg, fg: '#ffffff', edge: bg, d: .04, font: '"Jua"' }); return b; };
  const store = grp(box(.6, .5, .5, '#fdf6ea', 0, .25, 0), box(.64, .08, .54, '#4fae7a', 0, .54, 0), mesh(new THREE.BoxGeometry(.4, .28, .02), M('#bfe3f5', { emissive: '#bfe3f5', emissiveIntensity: .3 }), 0, .22, .26));
  const cafe = grp(box(.55, .45, .5, '#f3d9c0', 0, .225, 0), prism(.6, .18, .56, '#a0603c', 0, .45, 0), cyl(.08, .06, .14, 6, '#ffffff', .12, .07, .3), ico(.06, 0, '#a0603c', .12, .16, .3));
  const office = grp(box(.45, .95, .45, '#b8c6d9', 0, .475, 0), ...[0, 1, 2].map(i => mesh(new THREE.BoxGeometry(.34, .14, .02), M('#e8f4ff', { emissive: '#e8f4ff', emissiveIntensity: .25 }), 0, .22 + i * .27, .235)));
  const house = grp(box(.55, .42, .5, '#fff3e0', 0, .21, 0), prism(.62, .32, .62, '#e8836f', 0, .42, 0), box(.14, .22, .02, '#a8784e', 0, .11, .26));
  const icons = [store, cafe, office, house], IX = [-.85, -.28, .3, .88], IT = [1.0, 1.25, 1.5, 4.0], IC = ['#4fae7a', '#a0603c', '#5b7bb0', '#e8836f'];
  icons.forEach((o, i) => { o.position.set(IX[i], .62, .05); const l = lbl(PROPS.icons[i], IC[i]); l.position.set(0, .12, .3); o.add(l); table.add(o); });
  const X = grp(box(.95, .14, .14, '#e4473f', 0, 0, 0), box(.95, .14, .14, '#e4473f', 0, 0, 0)); X.children[0].rotation.z = .78; X.children[1].rotation.z = -.78; X.position.set(IX[3], 1.25, .3); table.add(X);
  // 마지막 체크 자석: 칠판 3번째 줄 끝에 붙는다
  const chk = grp(box(.17, .38, .14, '#4fae7a', -.1, -.04, 0), box(.17, .72, .14, '#4fae7a', .16, .11, 0)); chk.children[0].rotation.z = .75; chk.children[1].rotation.z = -.62;
  W.add(chk);
  const ledger = labelBoard(.62, .8, PROPS.ledgerTitle.slice(0, 3) + '\n' + PROPS.ledgerTitle.slice(3), { bg: '#fffaf0', fg: '#3e3328', edge: '#d9c7ad', d: .05, font: '"Black Han Sans"' });
  const sq = makeSquirrel(); sq.root.position.set(-.95, 0, .95); sq.root.scale.setScalar(.92); W.add(sq.root); sq.arms[0].paw.add(ledger); ledger.position.set(.05, -.35, .22); ledger.rotation.set(0, 0, 0);
  // 체크 위치: 3번째 줄 텍스트 끝
  let chkPos = bpt(1250, 700);
  EV.push({ t: .5, type: 'chalk', d: .8 }, { t: 3.75, type: 'chalk', d: .8 }, { t: 5.5, type: 'chalk', d: .8 });
  IT.forEach((t, i) => EV.push({ t, type: 'pop', n: 2 + i }));
  EV.push({ t: 4.5, type: 'land', n: 0, buzz: true }, { t: 7.0, type: 'cut' }, { t: 7.5, type: 'check' }, { t: 7.5, type: 'bell' });
  const shot = t => t < 7 ? 'A' : 'B';
  return {
    W, EV, dur: 10, sky: { zen: '#a8d8ea', hor: '#eef8f0' }, sun: { az: 30, el: 55 }, shot,
    boardLines: () => lines.map((l, i) => ({ text: l, t0: LT[i] })),
    bpt, BW, BH,
    cam(t) {
      if (shot(t) === 'A') { const u = seg(t, 0, 7); return { tg: [lerp(-.25, .45, ss(u)), 2.25, -.2], az: lerp(14, 24, u), el: 18, fh: lerp(9.0, 8.6, u), oy: 0 }; }
      const u = seg(t, 7, 10); const p = bpt(800, 560); return { tg: [p.x, p.y + .25, p.z + .2], az: lerp(10, 6, u), el: 12, fh: lerp(7.3, 7.0, ss(u)), oy: 0 };
    },
    update(t, C) {
      riseTiles(isl.tiles, t, [0, 0, 0]);
      drawBoard(t);
      icons.forEach((o, i) => popIn(o, t, IT[i]));
      // X: 집 위로 낙하
      { const s = t - 4.5; X.visible = s > 0; const d = drop(s, 1.4); X.position.y = .95 + d.y; applySquash(X, d.sy); }
      // 체크: 앞쪽에서 칠판으로 철썩
      { const s = t - 7.25; chk.visible = s > 0; const u = s < .25 ? ei(s / .25) : 1; const b = s > .25 ? Math.exp(-(s - .25) * 9) * Math.cos((s - .25) * 20) : 0;
        chk.position.set(chkPos.x, chkPos.y + .05, chkPos.z + lerp(2.2, .12, u) + b * .1); chk.scale.set(1 + b * .15, 1 - b * .15, 1); chk.rotation.y = 0; }
      // 다람쥐: 칠판 가리키기 → 아이콘 → 집 → 대장 들어올리기 → 만세
      const pt = (a, b) => env(t, a, b, .2, .2);
      const pointBoard = Math.max(pt(.3, 1.0), pt(3.6, 4.2), pt(5.3, 6.2));
      const pointTable = Math.max(pt(1.0, 2.2), pt(4.2, 5.0));
      const showLedger = pt(6.2, 7.6), cheer = ss(seg(t, 7.6, 7.85));
      sq.pose({
        armR: [lerp(lerp(.3, 1.35, pointTable), 1.2, pointBoard) * (1 - cheer) + .3 * cheer, lerp(lerp(.15, .35, pointTable), 1.95, pointBoard) * (1 - cheer) + 2.5 * cheer - Math.sin(t * 14) * .2 * cheer],
        armL: [lerp(1.0, .6, showLedger), lerp(.2, 2.4, showLedger) * (1 - cheer) + 2.5 * cheer + Math.sin(t * 14) * .2 * cheer],
        jump: Math.abs(Math.sin((t - 7.75) * Math.PI * 2)) * .4 * cheer + .12 * Math.max(...[.3, 1.0, 1.25, 1.5, 3.6, 4.0, 5.3, 6.2].map(a => t > a && t < a + .25 ? Math.sin(Math.PI * (t - a) / .25) : 0)), mouth: 1.3 + .7 * cheer, eye: 1 + .15 * cheer + .1 * pointBoard, headTurn: .35 * pointBoard - .25 * pointTable, headNod: -.18 * pointBoard, headTilt: Math.sin(t * 6) * .1, tailPuff: 1 + .1 * cheer,
        tailSway: Math.sin(t * 4) * .07,
      });
      sq.root.rotation.y = faceCam(C.az) + .35 - .25 * pointBoard;
      sq.root.position.x = t >= 7 ? -1.8 : -.95;
    },
    anchors: { sq: sq.anchors.headTop },
  };
}

export const BUILD = { 1: cut1, 2: cut2, 3: cut3, 4: cut4 };
