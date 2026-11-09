// 주인공 다람쥐 (사용자 일러스트를 로우폴리로) + 은행 직원 부엉이
import * as THREE from 'three';
import { ico, cyl, box, mesh, M, grp } from './lib3d.js';
import { lerp } from '/core/lib.js';

export const SQ = { body: '#e8a365', dark: '#d2864b', cream: '#fbe5cb', ear: '#f5c79a', eye: '#3d2a1f', nose: '#5c3a28', mouth: '#c9505a', blush: '#ef9a88', tailIn: '#f1be8c' };
const sc = (m, x, y, z) => { m.scale.set(x, y, z); return m; };

export function makeSquirrel() {
  const root = new THREE.Group();        // 발 기준
  const body = new THREE.Group(); root.add(body);   // 스쿼시는 여기에
  // 몸통과 배
  body.add(sc(ico(.62, 1, SQ.body, 0, .78, 0), 1, 1.12, .88));
  body.add(sc(ico(.47, 1, SQ.cream, 0, .72, .36), .9, 1.05, .45));
  // 발
  const feet = [-1, 1].map(s => { const f = sc(ico(.26, 1, SQ.dark, s * .32, .1, .14), 1.2, .5, 1.45); body.add(f); return f; });
  // 꼬리: 몸 뒤에서 위로 솟아 앞으로 말린다
  const tailW = new THREE.Group(); tailW.position.set(-.1, .45, -.4); tailW.rotation.y = .8; body.add(tailW); const tail = new THREE.Group(); tailW.add(tail);
  const curve = new THREE.CatmullRomCurve3([[0, 0, -.05], [0, .1, -.65], [0, .55, -1.1], [0, 1.25, -1.2], [0, 1.85, -1.0], [0, 2.15, -.55], [0, 2.05, -.15], [0, 1.75, .0]].map(p => new THREE.Vector3(...p)));
  const NT = 18;
  for (let i = 0; i < NT; i++) {
    const u = i / (NT - 1), p = curve.getPoint(u), r = .3 + .3 * Math.sin(Math.PI * Math.min(1, u * 1.15));
    tail.add(sc(ico(r, 1, SQ.body, p.x, p.y, p.z), 1, 1, 1));
    if (u > .12 && u < .9) { const tg = curve.getTangent(u); const n = new THREE.Vector3(0, -tg.z, tg.y);  // 안쪽(말리는 중심 방향)
      tail.add(sc(ico(r * .62, 1, SQ.tailIn, p.x + .12, p.y + n.y * r * .25, p.z + n.z * r * .25), .9, 1, 1)); }
    tail.add(sc(ico(r * 1.04, 0, SQ.dark, p.x - .04, p.y, p.z), .82, .96, .96));   // 짙은 테두리 느낌
  }
  // 머리
  const head = new THREE.Group(); head.position.set(0, 1.62, .05); body.add(head);
  head.add(sc(ico(.8, 1, SQ.body, 0, 0, 0), 1.22, .94, .95));
  const face = sc(ico(.66, 1, SQ.cream, 0, -.17, .36), 1.18, .74, .62); head.add(face);
  const eyes = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * .34, .03, .7);
    g.add(sc(ico(.135, 1, SQ.eye), .82, 1.06, .5)); const hl = ico(.045, 0, '#ffffff', .04, .06, .06); hl.castShadow = false; g.add(hl); head.add(g); return g; });
  head.add(sc(ico(.072, 0, SQ.nose, 0, -.12, .8), 1.35, .8, .6));
  const mouth = sc(ico(.075, 0, SQ.mouth, 0, -.3, .76), .9, 1.1, .5); head.add(mouth);
  [-1, 1].forEach(s => { const c = cyl(.15, .15, .02, 8, M(SQ.blush, { transparent: false }), s * .6, -.18, .55); c.rotation.x = Math.PI / 2; c.rotation.y = s * .55; c.castShadow = false; head.add(c); });
  const ears = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * .62, .56, -.08); g.rotation.z = -s * .25;
    g.add(sc(ico(.28, 1, SQ.dark), 1, 1, .45)); g.add(sc(ico(.17, 1, SQ.ear, 0, -.02, .09), 1, 1, .4)); head.add(g); return g; });
  // 팔: 어깨에서 회전 (z: 옆으로 들기, x: 앞으로 뻗기)
  const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * .5, 1.02, .18); body.add(sh);
    const a = new THREE.Group(); sh.add(a);
    const up = cyl(.1, .09, .4, 6, SQ.body, 0, -.2, 0); a.add(up);
    const paw = sc(ico(.17, 1, SQ.dark, 0, -.44, 0), 1.1, .85, .95); a.add(paw);
    return { sh, a, paw, s }; });
  // 땀방울 (당황할 때)
  const sweat = sc(ico(.09, 0, '#bfe3f5', .8, .35, .3), .8, 1.3, .8); sweat.castShadow = false; head.add(sweat); sweat.visible = false;

  const P0 = { armL: [0, -.15], armR: [0, -.15], squash: 1, jump: 0, ear: 0, eye: 1, mouth: 1, headTilt: 0, headTurn: 0, headNod: 0, tailSway: 0, lean: 0, sweat: 0, tailPuff: 1 };
  function pose(p) {
    p = { ...P0, ...p };
    // 팔 [앞으로(x), 옆으로(z)] 라디안
    arms.forEach(({ sh, s }) => { const [fx, sz] = s < 0 ? p.armL : p.armR; sh.rotation.set(-fx, 0, s * sz); });
    body.position.y = p.jump;
    body.scale.set(1 / Math.sqrt(p.squash), p.squash, 1 / Math.sqrt(p.squash));
    body.rotation.x = p.lean;
    ears.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.z = -s * (.25 + p.ear * .7); e.rotation.x = p.ear * .3; });
    eyes.forEach(e => e.scale.set(p.eye, p.eye, 1));
    mouth.scale.set(.9 * lerp(1, .8, p.mouth - 1), 1.1 * p.mouth, .5);
    head.rotation.set(p.headNod, p.headTurn, p.headTilt);
    tail.rotation.x = p.tailSway; tail.scale.setScalar(p.tailPuff);
    sweat.visible = p.sweat > .01; sweat.position.y = .35 - p.sweat * .25;
  }
  pose({});
  // 화면 위치 계산용 앵커
  const anchors = { headTop: new THREE.Object3D(), pawR: arms[1].paw };
  anchors.headTop.position.set(0, .9, 0); head.add(anchors.headTop);
  return { root, body, head, arms, tail, pose, anchors };
}

// 은행 직원: 남색 조끼를 입은 부엉이
export function makeOwl() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const C = { f: '#b9a48c', d: '#8f7a64', belly: '#efe3cf', vest: '#3f5a85', beak: '#f0b84a', eye: '#2b2622' };
  body.add(sc(ico(.62, 1, C.f, 0, .8, 0), 1, 1.15, .9));
  body.add(sc(ico(.5, 1, C.vest, 0, .7, .14), 1.05, 1.0, .85));
  body.add(sc(ico(.3, 1, C.belly, 0, .85, .48), .7, 1.1, .4));
  const tie = box(.1, .3, .05, '#e0675a', 0, .85, .62); body.add(tie);
  const head = new THREE.Group(); head.position.set(0, 1.62, 0); body.add(head);
  head.add(sc(ico(.6, 1, C.f, 0, 0, 0), 1.18, .95, .95));
  [-1, 1].forEach(s => {
    head.add(sc(ico(.27, 1, C.belly, s * .26, .02, .42), 1, 1, .45));
    const e = sc(ico(.11, 1, C.eye, s * .26, .03, .55), 1, 1, .5); head.add(e);
    const hl = ico(.035, 0, '#fff', s * .26 + .03, .07, .6); hl.castShadow = false; head.add(hl);
    const tuft = cyl(0, .13, .32, 5, C.d, s * .5, .52, 0); tuft.rotation.z = -s * .45; head.add(tuft);
    // 안경
    const ring = mesh(new THREE.TorusGeometry(.17, .025, 4, 8), '#4a3b30', s * .26, .03, .6); head.add(ring);
  });
  const brow = [-1, 1].map(s => { const b = box(.26, .05, .05, C.d, s * .26, .27, .52); head.add(b); return b; });
  const beak = cyl(0, .09, .2, 4, C.beak, 0, -.14, .58); beak.rotation.x = Math.PI; head.add(beak);
  const wings = [-1, 1].map(s => { const w = sc(ico(.3, 1, C.d, s * .62, .8, 0), .45, 1, .8); body.add(w); return w; });
  function pose(p = {}) {
    head.rotation.set(p.nod || 0, p.turn || 0, p.tilt || 0);
    brow.forEach((b, i) => { const s = i ? 1 : -1; b.rotation.z = s * (p.sad || 0) * .35; });
    wings.forEach((w, i) => { const s = i ? -1 : 1; w.rotation.z = s * (p.wing || 0); w.position.set(s * lerp(.62, .25, p.cross || 0), lerp(.8, 1.05, p.cross || 0), lerp(0, .5, p.cross || 0)); });
    body.rotation.z = p.sway || 0; body.position.y = p.hop || 0;
  }
  const anchors = { headTop: new THREE.Object3D() }; anchors.headTop.position.set(0, .75, 0); head.add(anchors.headTop);
  return { root, pose, head, anchors };
}
