// Toy squirrel (design from the user's reference): glossy plastic, round head and body, one continuous curled tail,
// big eyes. A few studs on the crown keep it in the brick-toy world. Units = stud pitch (8 mm).
import * as THREE from 'three';
import { plastic, STUD_R, STUD_H } from './bricks.js';

export const PAL = {
  brown: { fur: '#e9a263', dark: '#cf8248', light: '#f2bd8b', cream: '#fbe5cb', ear: '#f6c79b' },
  grey:  { fur: '#a9b0b6', dark: '#7c848b', light: '#c9ced2', cream: '#eceeef', ear: '#d6dadd' },
};
export const HEAD_Y = 7.0;   // head centre
const EYE = '#3d2a1f', NOSE = '#5a3826', MOUTH = '#c9505a', CHEEK = '#f08f80';

// plush fabric: matte, velvety sheen at grazing angles, fine fibre normals
function fuzzTex(seed) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const img = x.createImageData(N, N); let s = seed * 7919 + 1; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N * N; i++) { img.data[i * 4] = 128 + (R() - .5) * 150; img.data[i * 4 + 1] = 128 + (R() - .5) * 150; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < 9000; i++) {   // short fibres
    const px = R() * N, py = R() * N, a = R() * Math.PI * 2, l = 2 + R() * 5;
    x.strokeStyle = `rgb(${128 + Math.cos(a) * 110 | 0},${128 + Math.sin(a) * 110 | 0},230)`; x.lineWidth = .8;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); return t;
}
const FUZZ = fuzzTex(3), furCache = new Map(), FUR = new Set();
// flocked fabric (like a flocked toy animal): mottled colour, no specular, bright velvet sheen at grazing angles
function noiseTex(N, seed, f, rep) {
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N);
  let s = seed * 7919 + 1; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N * N; i++) { const v = f(R()); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.magFilter = THREE.NearestFilter; return t;
}
const MOTTLE = noiseTex(512, 5, r => 205 + r * 50, 4);
const STRANDS = noiseTex(256, 9, r => r * 255, 4);
export function fur(color) {
  if (furCache.has(color)) return furCache.get(color);
  const base = new THREE.Color(color), sheen = base.clone().lerp(new THREE.Color('#ffffff'), .7);
  const m = new THREE.MeshPhysicalMaterial({ color: base, map: MOTTLE, roughness: 1, metalness: 0, specularIntensity: 0, sheen: 1, sheenRoughness: .35, sheenColor: sheen, normalMap: FUZZ, normalScale: new THREE.Vector2(.9, .9), envMapIntensity: .5 });
  m.userData.furColor = color; FUR.add(m); furCache.set(color, m); return m;
}
// shell fur: a few offset layers with sparse strands, so the silhouette is soft and fuzzy
const shellCache = new Map();
function shellMat(color, k, n, push) {
  const key = color + k + (push ? 'p' : ''); if (shellCache.has(key)) return shellCache.get(key);
  const base = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .12 + k * .06);
  const m = new THREE.MeshStandardMaterial({ color: base, roughness: 1, envMapIntensity: .7, alphaMap: STRANDS, alphaTest: .5 + (k + 1) / (n + 1) * .42, side: THREE.FrontSide });
  const off = (k + 1) * .03;
  if (push) m.onBeforeCompile = sh => { sh.uniforms.uOff = { value: off }; sh.vertexShader = 'uniform float uOff;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += objectNormal * uOff;'); };
  m.customProgramCacheKey = () => push ? 'furshell' : 'furshell0';
  shellCache.set(key, m); return m;
}
function addShells(root, n = 3) {
  const list = []; root.traverse(o => { if (o.isMesh && FUR.has(o.material)) list.push(o); });
  for (const o of list) {
    const sc = Math.min(o.scale.x, o.scale.y, o.scale.z); if (sc < .3) continue;
    const sphere = o.geometry.type === 'SphereGeometry';
    for (let k = 0; k < n; k++) {
      const sh = new THREE.Mesh(o.geometry, shellMat(o.material.userData.furColor, k, n, !sphere)); sh.castShadow = false; sh.receiveShadow = true; sh.userData.shell = true;
      if (sphere) { const d = (k + 1) * .03; sh.scale.set(1 + d / o.scale.x, 1 + d / o.scale.y, 1 + d / o.scale.z); }
      o.add(sh);
    }
  }
}
function ell(rx, ry, rz, color, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), o.mat || (o.plastic ? plastic(color, o) : fur(color))); m.scale.set(rx, ry, rz);
  m.castShadow = m.receiveShadow = true; return m;
}
// a tube swept along a curve with a varying radius (rounded ends)
function sweep(curve, rad, n = 120, m = 36) {
  const frames = curve.computeFrenetFrames(n, false), pos = [], idx = [], uv = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), N = frames.normals[i], B = frames.binormals[i], r = rad(u);
    for (let j = 0; j <= m; j++) {
      const a = j / m * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(p.x + r * (c * N.x + s * B.x), p.y + r * (c * N.y + s * B.y), p.z + r * (c * N.z + s * B.z)); uv.push(u * 4, j / m);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a = i * (m + 1) + j, b = a + m + 1; idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const cap = u => Math.sqrt(Math.min(1, u / .06)) * Math.sqrt(Math.min(1, (1 - u) / .08));   // round off both ends

export function makeAcorn(s = 1, capCol = '#6b3d1c', nutCol = '#c98a3c') {
  const g = new THREE.Group();
  const nut = ell(1, 1.2, 1, nutCol, { plastic: true }); nut.position.y = 1.0; g.add(nut);
  const c = ell(1.12, .55, 1.12, capCol, { plastic: true }); c.position.y = 1.85; g.add(c);
  for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(STUD_R * .9, STUD_R * .9, STUD_H, 20), plastic(capCol)); st.position.set(i % 2 ? .35 : -.35, 2.35, i < 2 ? .35 : -.35); g.add(st); }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, .6, 12), plastic(capCol)); stem.position.y = 2.6; g.add(stem);
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  g.scale.setScalar(s); return g;
}

export function makeSquirrel(o = {}) {
  const C = o.grey ? PAL.grey : PAL.brown;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);

  // feet + short legs (pivot at the hip)
  const legs = [-.95, .95].map(x => {
    const g = new THREE.Group(); g.position.set(x, 1.3, .2); body.add(g);
    const leg = ell(.6, .7, .6, C.fur); leg.position.y = -.5; g.add(leg);
    const foot = ell(1.0, .42, 1.25, C.dark); foot.position.set(x * .12, -1.0, .45); g.add(foot);
    return g;
  });
  // body + belly
  const torso = ell(2.05, 2.25, 1.8, C.fur); torso.position.y = 3.0; body.add(torso);
  const belly = ell(1.3, 1.6, .9, C.cream); belly.position.set(0, 2.75, 1.15); body.add(belly);

  // one continuous tail: a C-curl rising from the back, lighter stripe on its inner face
  const tailPts = [[-.6, 1.6, -1.2], [-2.8, 1.5, -1.9], [-4.6, 3.2, -2.3], [-5.0, 6.0, -2.3], [-3.9, 8.4, -2.0], [-2.0, 9.0, -1.7], [-1.0, 8.0, -1.5]].map(p => new THREE.Vector3(...p));
  const tailCurve = new THREE.CatmullRomCurve3(tailPts, false, 'centripetal');
  const tailR = u => (1.0 + 1.0 * Math.sin(Math.min(1, u * 1.25) * Math.PI * .85)) * cap(u) * (1 - .3 * u);
  const TS = .72, tailG = new THREE.Group(); body.add(tailG); tailG.scale.set(o.tailFlip ? -TS : TS, TS, TS); tailG.position.set(-.6 * (1 - TS) * (o.tailFlip ? -1 : 1), 1.6 * (1 - TS), -1.2 * (1 - TS));
  const tail = new THREE.Mesh(sweep(tailCurve, tailR), fur(C.fur)); tail.castShadow = tail.receiveShadow = true; tailG.add(tail);
  const stripeCurve = new THREE.CatmullRomCurve3(tailPts.slice(1, 6).map((p, i) => p.clone().add(new THREE.Vector3(.35, -.1, 1.15 - i * .05))), false, 'centripetal');
  const stripe = new THREE.Mesh(sweep(stripeCurve, u => (.55 + .55 * Math.sin(u * Math.PI)) * cap(u)), fur(C.light)); stripe.castShadow = stripe.receiveShadow = true; tailG.add(stripe);

  // arms: round darker paws, pivot at the shoulder
  const arms = [-1.75, 1.75].map(x => {
    const g = new THREE.Group(); g.position.set(x, 4.3, .3); body.add(g);
    const a = ell(.62, 1.05, .62, C.dark); a.position.set(0, -.75, .2); g.add(a);
    const hand = new THREE.Group(); hand.position.set(0, -1.6, .3); g.add(hand);
    return { g, hand };
  });

  // head
  const head = new THREE.Group(); head.position.set(0, HEAD_Y, 0); body.add(head);
  const skull = ell(2.75, 2.25, 2.25, C.fur); head.add(skull);
  const mask = ell(1.75, 1.2, .9, C.cream); mask.position.set(0, -.55, 1.55); head.add(mask);
  const ears = [-1.75, 1.75].map(x => {
    const e = new THREE.Group(); e.position.set(x, 1.75, -.25); e.rotation.z = -x * .18; head.add(e);
    e.add(ell(.95, .9, .5, C.dark)); const inn = ell(.58, .55, .2, C.ear); inn.position.z = .38; e.add(inn);
    return e;
  });
  const eyes = [-1.0, 1.0].map(x => {
    const e = new THREE.Group(); e.position.set(x, .15, 1.95); e.rotation.y = x * .32; head.add(e);
    const ball = ell(.5, .62, .28, EYE, { mat: new THREE.MeshPhysicalMaterial({ color: EYE, roughness: .15, clearcoat: 1, clearcoatRoughness: .03 }) }); e.add(ball);
    const hi = ell(.17, .14, .08, '#fff', { mat: new THREE.MeshBasicMaterial({ color: '#ffffff' }) }); hi.position.set(.14, .3, .24); e.add(hi);
    const hi2 = ell(.07, .07, .05, '#fff', { mat: hi.material }); hi2.position.set(-.16, -.25, .25); e.add(hi2);
    return { e, ball, hi };
  });
  const nose = ell(.32, .2, .2, NOSE); nose.position.set(0, -.35, 2.42); head.add(nose);
  const mouth = ell(.3, .36, .14, MOUTH); mouth.position.set(0, -1.0, 2.38); head.add(mouth);
  const cheeks = [-1.85, 1.85].map(x => { const c = ell(.55, .32, .1, CHEEK, { mat: new THREE.MeshPhysicalMaterial({ color: CHEEK, roughness: .5, transparent: true, opacity: .75 }) }); c.position.set(x, -.65, 1.42); c.rotation.y = x * .3; head.add(c); return c; });
  const brows = [-1.0, 1.0].map(x => { const b = ell(.42, .09, .09, NOSE); b.position.set(x, .95, 2.0); b.rotation.y = x * .3; head.add(b); return b; });

  // accessories
  const crown = new THREE.Group(); crown.position.set(0, 2.0, -.1); head.add(crown);
  {
    const gold = plastic('#f2cd37');
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.25, .8, 40, 1, true), gold); ring.material.side = THREE.DoubleSide; ring.position.y = .4; crown.add(ring);
    for (const y of [0, .8]) { const b = new THREE.Mesh(new THREE.TorusGeometry(y ? 1.35 : 1.25, .1, 8, 40), gold); b.rotation.x = Math.PI / 2; b.position.y = y; crown.add(b); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2; const ac = makeAcorn(.33); ac.position.set(Math.cos(a) * 1.3, .75, Math.sin(a) * 1.3); crown.add(ac); }
    const gem = ell(.2, .2, .1, '#c91a09', { plastic: true }); gem.position.set(0, .4, 1.32); crown.add(gem);
    crown.traverse(m => { if (m.isMesh) m.castShadow = true; });
  }
  const glasses = new THREE.Group(); glasses.position.set(0, .2, 2.12); head.add(glasses);
  {
    const gm = new THREE.MeshPhysicalMaterial({ color: '#0b0d10', roughness: .06, clearcoat: 1, metalness: .3, envMapIntensity: 1.8 });
    for (const x of [-1.0, 1.0]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.68, .68, .14, 32), gm); l.rotation.x = Math.PI / 2; l.scale.set(1.2, 1, .85); l.position.set(x, 0, x === 0 ? 0 : -.12); l.rotation.y = x * .3; glasses.add(l); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(.7, .14, .14), gm); br.position.set(0, .2, .1); glasses.add(br);
    glasses.traverse(m => { if (m.isMesh) m.castShadow = true; });
  }
  const tearMat = plastic('#6fb7ff', { trans: true });
  const tears = [];
  for (let i = 0; i < 18; i++) { const d = ell(.22, .28, .22, '', { mat: tearMat }); d.visible = false; head.add(d); tears.push(d); }
  const sack = new THREE.Group(); body.add(sack);
  {
    const s = ell(1.6, 1.8, 1.5, '#c9a46b'); sack.add(s);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.45, .75, .8, 20), fur('#c9a46b')); neck.position.y = 1.9; sack.add(neck);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(.5, .15, 8, 24), plastic('#6b4a2b')); tie.rotation.x = Math.PI / 2; tie.position.y = 1.8; sack.add(tie);
    const ac = makeAcorn(.4); ac.rotation.x = Math.PI / 2; ac.position.set(0, -.8, 1.3); sack.add(ac);
    sack.position.set(1.8, 5.6, -1.6); sack.rotation.z = -.45;
    sack.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  }
  root.traverse(m => { if (m.isMesh && !m.userData.shell) { m.castShadow = true; m.receiveShadow = true; } });
  addShells(root);

  // p: x,y,z,ry; legs[2]; armL/armR [fwd, side]; lean, roll; nod/look/tilt; jaw 0..1; brow -1 worried … 1 angry;
  // cry 0..1 with cryT (time); crown/glasses/sack; blink; eyeS (eye scale)
  function pose(p) {
    root.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0); root.rotation.set(0, p.ry ?? 0, 0);
    body.position.set(0, p.bob ?? 0, 0); body.rotation.set(p.lean ?? 0, 0, p.roll ?? 0);
    legs[0].rotation.x = p.legs?.[0] ?? 0; legs[1].rotation.x = p.legs?.[1] ?? 0;
    const aL = p.armL ?? [0, .15], aR = p.armR ?? [0, .15];
    arms[0].g.rotation.set(aL[0], 0, -aL[1]); arms[1].g.rotation.set(aR[0], 0, aR[1]);
    head.rotation.set(p.nod ?? 0, p.look ?? 0, p.tilt ?? 0);
    const j = p.jaw ?? .25;
    mouth.scale.set(.3 + j * .25, .12 + j * .55, .14); mouth.position.y = -1.0 - j * .12;
    const es = p.eyeS ?? 1;
    eyes.forEach(({ e }) => e.scale.set(es, p.blink ? .1 : es, 1));
    const b = p.brow ?? 0;
    brows.forEach((br, i) => { br.visible = Math.abs(b) > .05; br.rotation.z = (i ? 1 : -1) * b * .5; br.position.y = .95 + (b < 0 ? .12 : 0); });
    crown.visible = !!p.crown; glasses.visible = !!p.glasses; sack.visible = !!p.sack;
    eyes.forEach(({ e }) => e.visible = !p.glasses);
    const cry = p.cry ?? 0, ct = p.cryT ?? 0;
    tears.forEach((d, i) => {   // fountain: two arcs of drops from the eyes
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), ph = (ct * 1.4 + k / 9) % 1;
      d.visible = cry > 0 && ph > .03;
      const vx = 3.0 + (k % 3) * .6, vy = 4.0 + (k % 2) * .8, tt = ph * 1.0;
      d.position.set(side * (1.2 + vx * tt), .3 + vy * tt - 7.5 * tt * tt, 2.1 + tt * 1.2);
      const ts = .5 + (k % 3) * .15; d.scale.set(.22 * ts, .28 * ts, .22 * ts);
    });
  }
  return { root, body, head, arms, legs, pose, eyes };
}

export function walkPose(phi, amp = .5) {
  const s = Math.sin(phi);
  return { legs: [s * amp, -s * amp], armL: [-s * amp * .7, .2], armR: [s * amp * .7, .2], bob: Math.abs(Math.cos(phi)) * .2 };
}
