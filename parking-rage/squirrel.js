// 주인공 다람쥐: 사용자 일러스트의 비율을 그대로 옮긴 3D (꼬리는 작게).
// 그림 좌표(px)를 머리 높이 = 1.0 단위로 환산: 1 단위 = 560px, 발바닥 = y 0.
import * as THREE from 'three';
import { M, SKIN, mesh } from './lib3d.js';
import { lerp } from '/core/lib.js';

export const SQ = { body: '#e8a365', dark: '#d2864b', cream: '#fbe5cb', ear: '#f5c79a', eye: '#3d2a1f', nose: '#5c3a28', mouth: '#c9505a', blush: '#f0a090', tailIn: '#f1be8c' };
const SPH = new THREE.SphereGeometry(1, 40, 28);
// 타원체: 반지름 rx, ry, rz
function ell(rx, ry, rz, c, x = 0, y = 0, z = 0, mat) {
  const m = mesh(SPH, mat || (typeof c === 'string' ? SKIN(c) : c), x, y, z); m.scale.set(rx, ry, rz); return m;
}
const MATTE = c => M(c, { roughness: .55 });

export function makeSquirrel() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  // 몸통: 가로 .53 × 세로 .49, 중심 높이 .61 / 배: 크림 타원
  body.add(ell(.49, .5, .42, SQ.body, 0, .62, 0));
  body.add(ell(.3, .37, .2, SQ.cream, .02, .56, .29));
  // 발: 넓적한 짙은 타원 (x ±.29)
  [-1, 1].forEach(s => body.add(ell(.22, .1, .27, SQ.dark, s * .29, .1, .14)));
  // 꼬리 (작게): 몸 뒤 왼쪽에서 말려 올라간다
  const tailW = new THREE.Group(); tailW.position.set(-.3, .35, -.32); tailW.rotation.y = .55; tailW.scale.setScalar(.78); body.add(tailW);
  const tail = new THREE.Group(); tailW.add(tail);
  const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0, .1, -.38], [0, .45, -.62], [0, .9, -.62], [0, 1.2, -.42], [0, 1.22, -.15], [0, 1.05, -.05]].map(p => new THREE.Vector3(...p)));
  // 매끈한 튜브: 굵기가 곡선을 따라 변한다 (끝은 둥글게)
  const rad = u => .1 + .2 * Math.sin(Math.PI * Math.min(1, .12 + u * .95));
  function smoothTube(r0, shift, col) {
    const TS = 96, RS = 32, geo = new THREE.TubeGeometry(curve, TS, 1, RS, false), pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i <= TS; i++) {
      const u = i / TS, c = curve.getPointAt(u), r = rad(u) * r0;
      for (let j = 0; j <= RS; j++) { const k = i * (RS + 1) + j; v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c); v.x += shift * rad(u); pos.setXYZ(k, v.x, v.y, v.z); }
    }
    geo.computeVertexNormals();
    const m = mesh(geo, SKIN(col)); tail.add(m);
    [0, 1].forEach(u => { const c = curve.getPointAt(u), r = rad(u) * r0; tail.add(ell(r, r, r, col, c.x + shift * rad(u), c.y, c.z)); });
  }
  smoothTube(1, 0, SQ.body);
  smoothTube(.7, .38, SQ.tailIn);
  // 머리: 처음 버전의 얼굴 (넓은 머리, 아래쪽 크림 마스크, 큰 눈), 새 몸 비율에 맞춰 축소
  const head = new THREE.Group(); head.position.set(0, 1.56, .04); body.add(head);
  const F = new THREE.Group(); F.scale.setScalar(.665); head.add(F);
  F.add(ell(.8 * 1.22, .8 * .94, .8 * .95, SQ.body));
  F.add(ell(.66 * 1.18, .66 * .74, .66 * .62, SQ.cream, 0, -.17, .36));
  const eyes = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * .34, .03, .7);
    g.add(ell(.135 * .82, .135 * 1.06, .135 * .5, SQ.eye, 0, 0, 0, MATTE(SQ.eye)));
    const hl = ell(.045, .045, .045, '#ffffff', .04, .06, .06, M('#ffffff', { emissive: '#ffffff', emissiveIntensity: .3 })); hl.castShadow = false; g.add(hl);
    const lid = ell(.15 * .9, .15 * .62, .15 * .55, SQ.body, 0, .2, .03); g.add(lid); g.userData.lid = lid; F.add(g); return g; });
  F.add(ell(.072 * 1.35, .072 * .8, .072 * .6, SQ.nose, 0, -.12, .8, MATTE(SQ.nose)));
  const mouth = ell(.075 * .9, .075 * 1.1, .075 * .5, SQ.mouth, 0, -.3, .76, MATTE(SQ.mouth)); F.add(mouth);
  [-1, 1].forEach(s => { const c = ell(.15, .15, .012, SQ.blush, s * .58, -.18, .63, M(SQ.blush, { roughness: .7 })); c.rotation.y = s * .55; c.castShadow = false; F.add(c); });
  const ears = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * .62, .56, -.08); g.rotation.z = -s * .25;
    g.add(ell(.28, .28, .126, SQ.dark)); g.add(ell(.17, .17, .068, SQ.ear, 0, -.02, .09)); F.add(g); return g; });
  // 팔: 어깨에서 짧은 팔 + 짙은 손 (기본은 가슴 앞에 모은 손)
  const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * .34, 1.0, .1); body.add(sh);
    const a = new THREE.Group(); sh.add(a);
    const up = ell(.06, .12, .06, SQ.body, 0, -.12, -.03); a.add(up);
    const paw = ell(.15, .1, .12, SQ.dark, 0, -.28, 0); a.add(paw);
    return { sh, a, paw, s }; });
  const sweat = ell(.05, .07, .04, '#bfe3f5', .66, .2, .25); sweat.castShadow = false; head.add(sweat); sweat.visible = false;

  const P0 = { armL: [1.1, .1], armR: [1.1, .1], squash: 1, jump: 0, ear: 0, eye: 1, mouth: 1, headTilt: 0, headTurn: 0, headNod: 0, tailSway: 0, lean: 0, sweat: 0, tailPuff: 1, lid: 0, brow: 0, eyeShake: 0 };
  function pose(p) {
    p = { ...P0, ...p };
    arms.forEach(({ sh, s }) => { const [fx, sz] = s < 0 ? p.armL : p.armR; sh.rotation.set(-fx, 0, s * sz); });
    body.position.y = p.jump;
    body.scale.set(1 / Math.sqrt(p.squash), p.squash, 1 / Math.sqrt(p.squash));
    body.rotation.x = p.lean;
    ears.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.z = -s * (.25 + p.ear * .7); e.rotation.x = p.ear * .3; });
    eyes.forEach(e => { e.scale.set(p.eye, p.eye, 1); const l = e.userData.lid; l.visible = p.lid > .02; l.position.y = .2 - p.lid * .13; });
    mouth.scale.set(.075 * .9 * lerp(1, .8, Math.max(0, p.mouth - 1)), .075 * 1.1 * p.mouth, .075 * .5);
    head.rotation.set(p.headNod, p.headTurn, p.headTilt);
    tail.rotation.x = p.tailSway; tail.scale.setScalar(p.tailPuff);
    brows.forEach((b, i) => { const s = i ? 1 : -1; b.visible = Math.abs(p.brow) > .02; b.rotation.z = -s * p.brow * .45; b.position.y = .26 - Math.abs(p.brow) * .03; });
    eyes.forEach((e, i) => { e.position.x = (i ? 1 : -1) * .34 + p.eyeShake; });
    sweat.visible = p.sweat > .01; sweat.position.y = .2 - p.sweat * .2;
  }
  // 소품: 선글라스, 그을음, 눈썹
  const glasses = new THREE.Group(); F.add(glasses); glasses.visible = false;
  const lensM = M('#15171c', { roughness: .15, metalness: .4 });
  [-1, 1].forEach(s => { glasses.add(ell(.2, .15, .05, null, s * .34, .05, .79, lensM)); });
  { const br = mesh(new THREE.BoxGeometry(.22, .04, .04), M('#15171c'), 0, .1, .82); glasses.add(br);
    [-1, 1].forEach(s => { const tm = mesh(new THREE.BoxGeometry(.04, .04, .5), M('#15171c'), s * .56, .1, .55); tm.rotation.y = -s * .35; glasses.add(tm); }); }
  const soot = new THREE.Group(); F.add(soot); soot.visible = false;
  const sootM = M('#2a2522', { transparent: true, opacity: .55, roughness: 1 });
  [[-.45, .3, .62, .22, .14], [.3, .45, .58, .18, .1], [.55, -.1, .55, .14, .1], [-.2, -.35, .7, .16, .08], [.1, .65, .35, .25, .12], [-.65, -.05, .4, .12, .14]].forEach(([x, y, z, rx, ry]) => {
    const e = ell(rx, ry, .03, null, x, y, z, sootM); e.lookAt(e.position.clone().multiplyScalar(2)); e.castShadow = false; soot.add(e); });
  const brows = [-1, 1].map(s => { const b = mesh(new THREE.BoxGeometry(.24, .05, .04), M(SQ.eye), s * .34, .26, .74); b.visible = false; F.add(b); return b; });
  const anchors = { headTop: new THREE.Object3D(), pawR: arms[1].paw };
  anchors.headTop.position.set(0, .6, 0); head.add(anchors.headTop);
  pose({});
  return { root, body, head, arms, tail, pose, anchors, glasses, soot };
}
