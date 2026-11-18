// 코스피 5,000 붕괴 — Brick Toy reel, 1080×1920, 25 s, 4 cuts
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePost } from '/core/three/post.js';
import { clamp, seg, ss, eo, lerp } from '/core/lib.js';
import { COL, BRICK, PLATE, brick, plate, plastic, brickGeo } from './bricks.js';
import { buildSet } from './set.js';
import { makeSquirrel, makeAcorn, walkPose } from './squirrel.js';

const W = 1080, H = 1920, DUR = 25;
const QS = new URLSearchParams(location.search);
const SSAA = +(QS.get('ssaa') ?? 2);
const CUTS = [0, 3, 11, 18, 25];
const cutAt = t => t < 3 ? 0 : t < 11 ? 1 : t < 18 ? 2 : 3;
const q = t => Math.floor(t * 12 + 1e-6) / 12;   // characters and bricks step on twos
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FONT = 'Jua, "Noto Color Emoji", sans-serif';

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(SSAA); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, W / H, .5, 3000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: QS.get('ao') !== '0', aoRadius: 3, aoThickness: 3, aoAmt: .85 });
post.bloom.strength = .16; post.bloom.threshold = 1.2;
post.vig.uniforms.amt.value = .3; post.vig.uniforms.warm.value = -.3; post.vig.uniforms.contrast.value = .24; post.vig.uniforms.sat.value = 1.1;

await document.fonts.load('80px Jua', '가나다코스피');
const set = await buildSet(scene);
if (QS.get('sm')) set.key.shadow.mapSize.set(+QS.get('sm'), +QS.get('sm'));

// —— canvas textures ——
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  let key = null;
  t.redraw = (k, ...a) => { if (k === key) return; key = k; x.clearRect(0, 0, w, h); draw(x, w, h, ...a); t.needsUpdate = true; };
  return t;
}
function screenMat(tex) { return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); }
function chart(x, w, h, o) {   // a stock-app chart. o: {pts, upTo, col, label, value, sub, line5000}
  x.fillStyle = o.bg ?? '#101318'; x.fillRect(0, 0, w, h);
  x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  x.fillStyle = '#9aa3ad'; x.font = `${h * .045}px ${FONT}`; x.fillText(o.label, w * .07, h * .1);
  const vs = o.vs ?? .11, big = vs > .15;
  x.fillStyle = o.col; x.font = `${h * vs}px ${FONT}`; x.fillText(o.value, w * .07, big ? h * .33 : h * .22);
  const vw = x.measureText(o.value).width;
  if (o.sub) { x.font = `${h * (big ? .08 : .05)}px ${FONT}`; x.fillText(o.sub, big ? w * .07 + vw + w * .04 : w * .07, big ? h * .31 : h * .29); }
  const top = h * (big ? .42 : .36), bot = h * .9, L = w * .06, R = w * .94;
  x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { const y = lerp(top, bot, i / 4); x.beginPath(); x.moveTo(L, y); x.lineTo(R, y); x.stroke(); }
  const P = o.pts, n = P.length, k = Math.max(1, Math.floor((n - 1) * (o.upTo ?? 1)));
  const px = i => lerp(L, R, i / (n - 1)), py = v => lerp(bot, top, v);
  if (o.line5000 != null) {
    x.setLineDash([16, 12]); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 4; x.beginPath(); x.moveTo(L, py(o.line5000)); x.lineTo(R, py(o.line5000)); x.stroke(); x.setLineDash([]);
    x.fillStyle = 'rgba(255,255,255,.75)'; x.font = `${h * .035}px ${FONT}`; x.textAlign = 'right'; x.fillText('5,000', R, py(o.line5000) - 12); x.textAlign = 'left';
  }
  const gr = x.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, o.col + '88'); gr.addColorStop(1, o.col + '00');
  x.beginPath(); x.moveTo(px(0), bot); for (let i = 0; i <= k; i++) x.lineTo(px(i), py(P[i])); x.lineTo(px(k), bot); x.closePath(); x.fillStyle = gr; x.fill();
  x.beginPath(); for (let i = 0; i <= k; i++) i ? x.lineTo(px(i), py(P[i])) : x.moveTo(px(i), py(P[i])); x.strokeStyle = o.col; x.lineWidth = w * .018; x.lineJoin = 'round'; x.stroke();
  x.fillStyle = o.col; x.beginPath(); x.arc(px(k), py(P[k]), w * .025, 0, 7); x.fill();
}
const series = (n, f) => [...Array(n)].map((_, i) => f(i / (n - 1), i));
const wig = (i, a) => Math.sin(i * 2.3) * a + Math.sin(i * 5.1) * a * .6;
const CRASH = series(40, (u, i) => clamp(.82 - u * u * .78 + wig(i, .035) * (1 - u * .5), .03, .97));
const RISE = series(40, (u, i) => clamp(.12 + u * .78 + wig(i, .04), .03, .97));

// —— groups per cut ——
const G = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); scene.add(g); return g; });
const shadowAll = g => g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

// CUT 1: phone with crash chart, shocked squirrel, cracking acorn bank
const C1 = {};
{
  const g = G[0];
  const phone = new THREE.Group(); phone.position.set(.6, 0, -9); phone.rotation.set(0, .06, 0); g.add(phone);
  { let by = 0; [[26, 3.2, 20, '#7b2d26'], [24, 2.6, 18, '#274b6d'], [25, 3.0, 19, '#c9a45c']].forEach(([w, h, d, col], i) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: .75 })); b.position.set(-.8, by + h / 2, -10); b.rotation.y = (i - 1) * .06; g.add(b);
      const pg = new THREE.Mesh(new THREE.BoxGeometry(w - .6, h - .6, d - .3), new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: .9 })); pg.position.copy(b.position).add(V(.35, 0, 0)); pg.rotation.y = b.rotation.y; g.add(pg); by += h; });
    phone.position.y = by; C1.by = by; }
  const lean = new THREE.Group(); lean.rotation.x = -.2; phone.add(lean);
  const bodyM = new THREE.Mesh(new RoundedBoxGeometry(9.4, 19, .9, 6, .9), new THREE.MeshPhysicalMaterial({ color: '#1a1c20', roughness: .25, metalness: .4, clearcoat: 1, clearcoatRoughness: .05 }));
  bodyM.position.y = 9.5; lean.add(bodyM);
  C1.tex = canvasTex(560, 1140, (x, w, h, u) => chart(x, w, h, { pts: CRASH, upTo: u, col: '#ff3b30', label: 'KOSPI 코스피', value: '4,968', sub: '▼ 5,000 붕괴', line5000: .3 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 18.2), screenMat(C1.tex)); scr.position.set(0, 9.5, .46); lean.add(scr);
  const stand = brick(4, 2, COL.dgray); stand.position.set(0, 0, -2.2); phone.add(stand);
  const stand2 = brick(4, 1, COL.dgray); stand2.position.set(0, BRICK, -2.6); phone.add(stand2);
  C1.sq = makeSquirrel(); g.add(C1.sq.root);
  // acorn piggy bank (big acorn with a coin slot) + its crack
  const bank = new THREE.Group(); bank.position.set(-7.4, C1.by, -6.4); g.add(bank); C1.bank = bank;
  const ac = makeAcorn(2.3); bank.add(ac);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(1.6, .3, .35), plastic('#1b1b1b')); slot.position.set(0, 2.38 * 2.3 + .1, 0); bank.add(slot);
  const crack = new THREE.Group(); bank.add(crack); C1.crack = crack;
  const rx = 2.3, ry = 2.76, cy = 2.3;   // nut ellipsoid
  const zz = [[.1, 3.95], [-.35, 3.4], [.3, 2.9], [-.25, 2.3], [.35, 1.75], [-.1, 1.2], [.2, .7]];
  const onS = (x0, y0) => { const k = 1 - (x0 / rx) ** 2 - ((y0 - cy) / ry) ** 2; return V(x0, y0, Math.sqrt(Math.max(0, k)) * rx + .02); };
  const cm = plastic('#2a160a');
  for (let i = 0; i < zz.length - 1; i++) {
    const a = onS(...zz[i]), b = onS(...zz[i + 1]), d = b.clone().sub(a);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, d.length(), 8), cm);
    s.position.copy(a).addScaledVector(d, .5); s.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); crack.add(s);
  }
  C1.chips = [0, 1, 2].map(i => { const c = new THREE.Mesh(new THREE.BoxGeometry(.5, .35, .3), plastic('#c98a3c')); bank.add(c); return c; });
  C1.coins = [0, 1, 2, 3].map(i => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .18, 24), plastic('#f2cd37')); bank.add(c); return c; });
  C1.siren = new THREE.PointLight('#ff2a1a', 0, 60, 1.5); C1.siren.position.set(6, 22, 8); g.add(C1.siren);
  shadowAll(g);
}

// CUT 2: split stage — brick wall down the middle; June (left, on a podium) vs now (right)
const C2 = {};
{
  const g = G[1];
  for (let r = 0; r < 14; r++) { const b = brick(1, 6, r % 2 ? COL.white : '#d9dde0'); b.position.set(0, r * BRICK, -1 + (r % 2 ? .5 : 0)); g.add(b); }
  const bpL = new THREE.Mesh(new THREE.BoxGeometry(15, .3, 12), new THREE.MeshPhysicalMaterial({ color: '#f2cd37', roughness: .6, clearcoat: .1 })); bpL.position.set(-7.6, .15, 0); g.add(bpL);
  const bpR = new THREE.Mesh(new THREE.BoxGeometry(15, .3, 12), new THREE.MeshPhysicalMaterial({ color: '#56677a', roughness: .6, clearcoat: .1 })); bpR.position.set(7.6, .15, 0); g.add(bpR);
  // podium for the June squirrel
  for (let i = 0; i < 2; i++) { const b = brick(6, 4, COL.red); b.position.set(-6.5, .3 + i * BRICK, .5); g.add(b); }
  const sign = (x, tex) => {
    const s = new THREE.Group(); s.position.set(x, 0, -4); g.add(s);
    for (const px of [-5.5, 5.5]) for (let i = 0; i < 11; i++) { const b = brick(1, 1, COL.black); b.position.set(px, .3 + i * BRICK, 0); s.add(b); }
    const frame = new THREE.Mesh(new RoundedBoxGeometry(12, 8.6, .8, 4, .3), plastic(COL.black)); frame.position.set(0, 17.2, 0); s.add(frame);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(11, 7.6), screenMat(tex)); scr.position.set(0, 17.2, .42); s.add(scr);
    return scr;
  };
  C2.texL = canvasTex(880, 608, (x, w, h, u) => chart(x, w, h, { pts: RISE, upTo: u, col: '#ffc531', label: '6월 · KOSPI', value: '9,385', sub: '▲ 사상 최고', vs: .26 }));
  C2.texR = canvasTex(880, 608, (x, w, h, u, on) => on ? chart(x, w, h, { pts: CRASH, upTo: u, col: '#ff3b30', label: '지금 · KOSPI', value: '4,968', sub: '▼ -47%', vs: .26 }) : (x.fillStyle = '#0c0e11', x.fillRect(0, 0, w, h)));
  sign(-7.4, C2.texL); sign(7.4, C2.texR);
  // backdrops: sunny June (left) vs a gloomy now (right)
  const bd = (x, col) => { const m = new THREE.Mesh(brickGeo(15, 34, .3, { tile: true }), new THREE.MeshPhysicalMaterial({ color: col, roughness: .55, clearcoat: .15 })); m.rotation.x = Math.PI / 2; m.position.set(x, 17, -7.2); m.receiveShadow = true; g.add(m); };
  bd(-7.55, '#ffcf4a'); bd(7.55, '#2c3846');
  const sun = new THREE.Group(); sun.position.set(-7.4, 27.5, -6.6); g.add(sun); C2.sun = sun;
  { const d = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, .5, 40), plastic(COL.orange)); d.rotation.x = Math.PI / 2; sun.add(d);
    const d2 = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, .6, 40), plastic(COL.yellow)); d2.rotation.x = Math.PI / 2; sun.add(d2);
    for (let i = 0; i < 10; i++) { const r = brick(1, 2, COL.orange, { h: PLATE }); const a = i / 10 * Math.PI * 2; r.rotation.set(Math.PI / 2, 0, 0); const rr = new THREE.Group(); rr.rotation.z = a; r.position.set(0, 3.5, -.2); rr.add(r); sun.add(rr); } }
  const cloud = new THREE.Group(); cloud.position.set(7.6, 27.5, -5.8); g.add(cloud);
  for (const [x, y, r] of [[-2.6, -.4, 1.6], [-.8, .5, 2.2], [1.4, .2, 1.9], [3.0, -.5, 1.3], [.3, -.9, 1.6]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), plastic('#7d8791')); c.position.set(x, y, 0); c.scale.z = .6; cloud.add(c); }
  const rainMat = plastic('#6fb7ff', { trans: true });
  C2.rain = [...Array(14)].map((_, i) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .9, 10), rainMat); g.add(d); return d; });
  const CONF = [COL.red, COL.blue, COL.green, COL.white, COL.orange, '#ff6fb5'];
  C2.conf = [...Array(26)].map((_, i) => { const m = brick(1, 1, CONF[i % CONF.length], { h: PLATE, tile: true }); m.scale.set(.6, 1, .6); g.add(m); return m; });
  C2.cool = new THREE.SpotLight('#7aa6ff', 260, 80, .5, .7); C2.cool.position.set(8, 40, 20); C2.cool.target.position.set(7, 5, 0); g.add(C2.cool, C2.cool.target);
  C2.L = makeSquirrel(); g.add(C2.L.root);
  C2.R = makeSquirrel(); g.add(C2.R.root);
  // the account (a tiny brick tablet) in the right squirrel's paws
  C2.acct = new THREE.Group(); g.add(C2.acct);
  C2.acctTex = canvasTex(256, 180, x => { x.fillStyle = '#f7f7f4'; x.fillRect(0, 0, 256, 180); x.fillStyle = '#333'; x.font = `34px ${FONT}`; x.textAlign = 'center'; x.fillText('내 계좌', 128, 52); x.fillStyle = '#e0261b'; x.font = `64px ${FONT}`; x.fillText('-47%', 128, 140); });
  C2.acctTex.redraw(1);
  const ab = new THREE.Mesh(new RoundedBoxGeometry(3.4, 2.4, .35, 3, .12), plastic(COL.black)); C2.acct.add(ab);
  const as = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.15), screenMat(C2.acctTex)); as.position.z = .18; C2.acct.add(as);
  // falling stock cards
  const card = (a, b) => {
    const tex = canvasTex(512, 300, x => {
      x.fillStyle = '#fbfbf8'; x.fillRect(0, 0, 512, 300); x.textAlign = 'center';
      x.fillStyle = '#20242a'; x.font = `64px ${FONT}`; x.fillText(a, 256, 112); x.fillStyle = '#e0261b'; x.font = `110px ${FONT}`; x.fillText(b, 256, 245);
    }); tex.redraw(1);
    const m = new THREE.Group();
    const t = new THREE.Mesh(new RoundedBoxGeometry(6.8, 4.0, .4, 3, .15), plastic(COL.white)); m.add(t);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.75), new THREE.MeshPhysicalMaterial({ map: tex, roughness: .3, clearcoat: .8 })); f.position.z = .21; m.add(f);
    g.add(m); return m;
  };
  C2.cards = [card('삼성전자', '-49%'), card('SK하이닉스', '-63%')];
  C2.warm = new THREE.SpotLight('#ffd27a', 0, 80, .5, .6); C2.warm.position.set(-8, 40, 20); C2.warm.target.position.set(-7, 5, 0); g.add(C2.warm, C2.warm.target);
  shadowAll(g);
}

// CUT 3: foreign squirrels march out with acorn sacks; three boards light up behind
const C3 = {};
{
  const g = G[2];
  const tower = new THREE.Group(); tower.position.set(0, 0, -12); g.add(tower);
  for (const px of [-8, 8]) for (let i = 0; i < 26; i++) { const b = brick(2, 2, i % 2 ? COL.lgray : COL.dgray); b.position.set(px, i * BRICK, 0); tower.add(b); }
  const items = [
    ['엔비디아 흔들', '#ffb020', 'shake'], ['미국 금리 5%', '#ff3b30', 'up'], ['달러 강세', '#3ddc84', 'dollar'],
  ];
  C3.boards = items.map(([txt, col, icon], i) => {
    const tex = canvasTex(900, 330, (x, w, h, on) => {
      x.fillStyle = on ? '#121821' : '#07090c'; x.fillRect(0, 0, w, h);
      if (!on) return;
      x.fillStyle = col; x.beginPath(); x.roundRect(30, 40, 250, 250, 40); x.globalAlpha = .18; x.fill(); x.globalAlpha = 1;
      x.strokeStyle = col; x.lineWidth = 14; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
      if (icon === 'shake') { for (let k = 0; k <= 8; k++) x.lineTo(60 + k * 24, 165 + (k % 2 ? -50 : 50) * (k < 8 ? 1 : 0)); }
      else if (icon === 'up') { x.moveTo(155, 250); x.lineTo(155, 80); x.moveTo(90, 145); x.lineTo(155, 80); x.lineTo(220, 145); }
      else { x.font = `220px ${FONT}`; x.fillStyle = col; x.textAlign = 'center'; x.fillText('$', 155, 245); }
      x.stroke();
      x.fillStyle = '#fff'; x.font = `96px ${FONT}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(txt, 320, 170);
    });
    const fr = new THREE.Mesh(new RoundedBoxGeometry(15.6, 6.2, .8, 4, .3), plastic(COL.black)); fr.position.set(0, 15 + (2 - i) * 7.4, 0); tower.add(fr);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 5.35), screenMat(tex)); s.position.set(0, 15 + (2 - i) * 7.4, .42); tower.add(s);
    return tex;
  });
  C3.walkers = [0, 1, 2].map(() => { const s = makeSquirrel({ grey: true, tailFlip: true }); g.add(s.root); return s; });
  C3.hero = makeSquirrel(); g.add(C3.hero.root);
  shadowAll(g);
}

// CUT 4: chalkboard on an easel; ❌ cards stamped, ⭕ cards checked
const C4 = {};
{
  const g = G[3];
  const board = new THREE.Group(); board.position.set(0, 8.5, -4); board.rotation.x = -.06; g.add(board);
  const wood = new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: .6 });
  const fr = new THREE.Mesh(new RoundedBoxGeometry(21, 32, 1.2, 4, .4), wood); fr.position.y = 16; fr.castShadow = fr.receiveShadow = true; board.add(fr);
  const slateTex = canvasTex(1000, 1500, x => {
    x.fillStyle = '#24402f'; x.fillRect(0, 0, 1000, 1500);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${.02 + (i % 5) * .006})`; x.beginPath(); x.ellipse((i * 137) % 1000, (i * 311) % 1500, 120, 30, i, 0, 7); x.fill(); }
    x.font = `78px ${FONT}`; x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillStyle = '#ff8a80'; x.fillText('❌ 이렇게 하지 마세요', 60, 105);
    x.fillStyle = '#9ff0b0'; x.fillText('⭕ 이렇게 하세요', 60, 880);
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 5; x.beginPath(); x.moveTo(60, 800); x.lineTo(940, 800); x.stroke();
  }); slateTex.redraw(1);
  const slate = new THREE.Mesh(new THREE.PlaneGeometry(19.4, 29.1), new THREE.MeshStandardMaterial({ map: slateTex, roughness: .95 })); slate.position.set(0, 16, .62); board.add(slate);
  for (const [px, rz] of [[-8, .12], [8, -.12]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 13, 1.2), wood); l.position.set(px, 2.2, .3); l.rotation.z = rz; l.castShadow = true; board.add(l); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14, 1.2), wood); back.position.set(0, 2, -4); back.rotation.x = .45; back.castShadow = true; board.add(back);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(20, .5, 1.6), wood); tray.position.set(0, .1, .9); board.add(tray);
  const chalk = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 2.2, 12), new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: .9 })); chalk.rotation.z = Math.PI / 2; chalk.position.set(5, .6, 1.1); board.add(chalk);
  const rows = [['공포에 전량 손절', 'x'], ['빚내서 물타기', 'x'], ['커뮤 급등주 추격', 'x'], ['내 종목 비중표 적기', 'o'], ['적립식 자동이체 유지', 'o']];
  C4.cards = rows.map(([txt, kind], i) => {
    const tex = canvasTex(1000, 210, (x, w, h, mark) => {
      x.fillStyle = '#fbfbf8'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#22262c'; x.font = `84px ${FONT}`; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(txt, 50, h / 2 + 4);
      if (!mark) return;
      const cx = w - 120, cy = h / 2;
      if (kind === 'x') {
        x.save(); x.translate(cx, cy); x.rotate(-.18); x.strokeStyle = '#d61f1f'; x.lineWidth = 12; x.beginPath(); x.arc(0, 0, 82, 0, 7); x.stroke();
        x.lineWidth = 20; x.lineCap = 'round'; x.beginPath(); x.moveTo(-42, -42); x.lineTo(42, 42); x.moveTo(42, -42); x.lineTo(-42, 42); x.stroke(); x.restore();
        x.globalAlpha = .1; x.fillStyle = '#d61f1f'; x.fillRect(0, 0, w, h); x.globalAlpha = 1;
        x.strokeStyle = 'rgba(214,31,31,.8)'; x.lineWidth = 7; x.beginPath(); x.moveTo(40, h / 2 + 4); x.lineTo(40 + x.measureText(txt).width + 20, h / 2 + 4); x.stroke();
      } else {
        x.fillStyle = '#1f9d4c'; x.beginPath(); x.arc(cx, cy, 80, 0, 7); x.fill();
        x.strokeStyle = '#fff'; x.lineWidth = 20; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(cx - 40, cy + 2); x.lineTo(cx - 10, cy + 34); x.lineTo(cx + 44, cy - 30); x.stroke();
      }
    });
    const m = new THREE.Group();
    const t = new THREE.Mesh(new RoundedBoxGeometry(17.6, 3.7, .4, 3, .15), plastic(COL.white)); m.add(t);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(17.2, 3.6), new THREE.MeshPhysicalMaterial({ map: tex, roughness: .35, clearcoat: .6 })); f.position.z = .21; m.add(f);
    const y = i < 3 ? 25.5 - i * 4.1 : 9.8 - (i - 3) * 4.1;
    m.position.set(0, y, .95); board.add(m);
    return { m, tex, kind, y };
  });
  C4.board = board;
  C4.sq = makeSquirrel(); g.add(C4.sq.root);
  const stick = new THREE.Group(); C4.stick = stick;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, 9, 12), plastic('#6b3d1c')); rod.position.y = 4.5; stick.add(rod);
  const tipM = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 12), plastic(COL.red)); tipM.position.y = 9; stick.add(tipM);
  stick.rotation.x = Math.PI; C4.sq.arms[0].hand.add(stick);
  shadowAll(g);
}

// —— performance ——
const E = {
  siren: 0, chartFall: [.5, 1.5], shock: 1.4, crack: 2.15,
  fanfare: 3.1, scratch: 6.0, cry: 6.5, card1: 7.5, card2: 8.5,
  march: 11.0, board: [12.0, 13.5, 15.0], grab: 15.4, whoosh: 17.0,
  board4: 18.0, stamps: [19.0, 19.6, 20.2], checks: [21.5, 22.3],
};
function cut1(t) {
  C1.tex.redraw(Math.round(seg(t, ...E.chartFall) * 30), seg(t, ...E.chartFall));
  const sh = seg(t, E.shock, E.shock + .25), j = ss(sh);
  C1.sq.pose({
    x: 3.6, z: 2.5, ry: lerp(-.4, -.15, j), look: lerp(-.45, 0, j), nod: lerp(-.35, -.12, j), lean: lerp(0, -.12, j),
    jaw: lerp(.15, 1, j), eyeS: lerp(1, 1.25, j), brow: lerp(0, -1, j),
    armL: [lerp(0, -.3, j), lerp(.15, 2.3, j)], armR: [lerp(0, -.3, j), lerp(.15, 2.3, j)], bob: j * .35 * Math.sin(seg(t, E.shock, E.shock + .5) * Math.PI),
    blink: t < 1 && Math.floor(t * 12) === 8,
  });
  const c = t >= E.crack, k = seg(t, E.crack, E.crack + .6);
  C1.crack.visible = c;
  C1.bank.rotation.z = c ? Math.sin(k * 40) * .05 * (1 - k) : 0;
  C1.chips.forEach((m, i) => {
    m.visible = c; const u = clamp((t - E.crack) * 1.2), dir = i - 1;
    m.position.set(dir * (.6 + u * 3), 4.2 + u * 3 - u * u * 7.5 + (u > .9 ? 0 : 0), 2.6 + u * 1.5); m.position.y = Math.max(.2, m.position.y); m.rotation.set(u * 9, u * 7 + i, 0);
  });
  C1.coins.forEach((m, i) => {
    const u = clamp((t - E.crack - .1 - i * .06) * 1.6); m.visible = c && u > 0;
    const vx = (i - 1.5) * 1.6; m.position.set(vx * u * 1.6, Math.max(.1, 3.2 + u * 2.4 - u * u * 5.5), 2.4 + u * 2.4); m.rotation.set(u * 6 + i, 0, u * 4);
  });
  C1.siren.intensity = t < 1.6 ? (Math.floor(t * 6) % 2 ? 900 : 120) : 0;
}
function cut2(t) {
  const u = t - 3;
  const v = ss(seg(t, 3.0, 3.4));   // June: pride, V arms, shouting
  const hop = Math.max(0, Math.sin(seg(t, 3.2, 3.7) * Math.PI)) * .8;
  const after = t >= E.scratch;
  C2.L.pose({
    x: -6.5, y: .3 + 2 * BRICK + hop, z: .8, ry: .2, crown: true, jaw: .85 + .15 * Math.sin(u * 8), eyeS: 1.05, brow: .3,
    armL: [-.3, lerp(.2, 2.6, v)], armR: [-.3, lerp(.2, 2.6, v) + .1 * Math.sin(u * 6)], nod: -.15, tilt: .08 * Math.sin(u * 4),
  });
  const cr = seg(t, E.cry, E.cry + .3);
  C2.R.pose({
    x: 7.2, y: .3, z: 1.5, ry: -.15, nod: .22, jaw: after ? lerp(.3, 1, cr) : .2, brow: -1, eyeS: after ? lerp(1.1, .9, cr) : .95, roll: .05,
    armL: [-1.0, .35], armR: [-1.0, .35], cry: t >= E.cry ? 1 : 0, cryT: q(t) - E.cry, lean: .08,
  });
  C2.acct.position.set(7.2, 4.0, 4.3); C2.acct.rotation.set(-.35, -.15, 0); C2.acct.visible = true;
  C2.texL.redraw(Math.round(seg(t, 3.0, 4.2) * 30), seg(t, 3.0, 4.2));
  C2.texR.redraw(Math.round(seg(t, 3.0, 4.2) * 30), seg(t, 3.0, 4.2), true);
  C2.warm.intensity = 1500;
  C2.sun.rotation.z = -q(t) * .6;
  C2.rain.forEach((d, i) => { const ph = (q(t) * .9 + i * .137) % 1; d.position.set(7.6 + ((i * 5) % 11) / 11 * 7 - 3.5, 25.5 - ph * 25, -5 + (i % 3) * 2.6); d.visible = d.position.y > 1; });
  C2.conf.forEach((m, i) => { const k = (q(t) - 3.1) * (.22 + (i % 5) * .03) + (i * .173) % 1; const ph = k % 1; m.visible = t > 3.1; m.position.set(-14 + ((i * 7) % 26) / 26 * 13, 30 - ph * 30, -4 + (i % 4) * 2.4); m.rotation.set(ph * 9 + i, ph * 5, ph * 7); });
  const land = [[-3.2, -.22], [3.4, .18]];
  C2.cards.forEach((m, i) => {
    const t0 = [E.card1, E.card2][i], k = clamp((q(t) - t0) / .45);
    m.visible = t >= t0 - .5;
    const y0 = 22, yE = 2.15;
    const yy = t < t0 ? lerp(y0 + 6, y0, 0) : k < 1 ? lerp(y0, yE, k * k) : yE + Math.max(0, Math.sin(seg(t, t0 + .45, t0 + .75) * Math.PI)) * .5;
    m.position.set(land[i][0], t < t0 ? y0 + 10 * (1 - seg(t, t0 - .5, t0)) : yy, 7.5 + i * .6);
    m.rotation.set(k < 1 ? -.4 + k * .1 : -1.15, 0, land[i][1] + (1 - k) * (i ? .6 : -.6));
  });
}
function cut3(t) {
  C3.boards.forEach((tex, i) => tex.redraw(t >= E.board[i] ? 1 : 0, t >= E.board[i]));
  const sp = t < E.whoosh ? .55 : .55 + (t - E.whoosh) * 9;
  const dist = t < E.whoosh ? (t - 11) * .55 : 6 * .55 + (t - E.whoosh) * .55 + (t - E.whoosh) ** 2 * 6;
  const qt = q(t);
  C3.walkers.forEach((s, i) => {
    const x = -1.5 + i * 5.8 + dist;
    s.pose({ x, z: 1.5 - i * .3, ry: .95, glasses: true, sack: true, ...walkPose((qt - 11) * 5 + i, .45), jaw: .1, nod: -.08 });
  });
  const lx = -1.5 + dist, gr = seg(t, E.grab - .3, E.grab);
  C3.hero.pose({
    x: lerp(-7.5, lx - 3.4, ss(seg(t, 11, E.grab))), z: 2.2, ry: .75, lean: lerp(0, .7, ss(gr)), bob: -gr * 1.1,
    armL: [lerp(0, -1.6, ss(gr)), .25], armR: [lerp(0, -1.5, ss(gr)), .1], legs: [gr * -1.1, gr * -1.3],
    jaw: t > E.grab ? .8 : .25, brow: -1, eyeS: 1.1, cry: t > E.grab ? 1 : 0, cryT: qt, look: -.35, nod: -.55 * gr,
  });
}
function cut4(t) {
  const st = E.stamps, ck = E.checks;
  C4.cards.forEach((c, i) => {
    const tt = c.kind === 'x' ? st[i] : ck[i - 3];
    c.tex.redraw(t >= tt ? 1 : 0, t >= tt);
    const k = seg(t, tt, tt + .15);
    c.m.position.z = .95 - (t >= tt && k < 1 ? .25 * Math.sin(k * Math.PI) : 0);
  });
  // squirrel: points at the card being marked
  const tgts = [...st, ...ck], idx = tgts.reduce((a, v, i) => t >= v - .35 ? i : a, -1);
  const cy = idx < 0 ? 20 : C4.cards[idx].y;
  const ang = lerp(2.0, 2.75, clamp((cy - 9) / 18));
  const tap = idx >= 0 ? Math.max(0, Math.sin(seg(t, tgts[idx] - .2, tgts[idx] + .1) * Math.PI)) * .18 : 0;
  C4.sq.pose({ x: 6.2, z: 6.5, ry: -.35, armL: [-.15, ang + tap], armR: [-.2, .35], jaw: .45 + .3 * Math.sin(t * 7), brow: .2, look: .25, tilt: -.08, nod: -.05 });
}

// —— cameras ——
function cam(t, c) {
  let pos, look, fov = 38, focus, aper = 900, span = 30;
  if (c === 0) {
    const shake = t >= E.crack && t < E.crack + .4 ? Math.sin(t * 90) * .25 * (1 - seg(t, E.crack, E.crack + .4)) : 0;
    const push = ss(seg(t, 0, 3));
    pos = V(0 + shake, 12 + shake * .6, lerp(50, 47, push)); look = V(-.3, 13.2, -2); focus = V(3.6, 7, 2.5); aper = 600; span = 34;
  } else if (c === 1) {
    const u = ss(seg(t, 3, 11));
    pos = V(0, lerp(14, 13, u), lerp(70, 66, u)); look = V(0, 13.6, -1); focus = V(0, 6, 1); aper = 420; span = 40;
  } else if (c === 2) {
    const u = seg(t, 11, 18);
    pos = V(lerp(0, 3, u), 15, 64); look = V(lerp(1, 3, u), 17.5, -4); focus = V(0, 5, 1.5); aper = 420; span = 40; fov = 40;
  } else {
    const u = ss(seg(t, 18, 25));
    pos = V(0, 21, lerp(56, 60, u)); look = V(0, 20.4, -3); focus = V(0, 20, -3); aper = 300; span = 36; fov = 42;
    const st = [...E.stamps, ...E.checks].find(s => t >= s && t < s + .12); if (st) pos.y += .15;
  }
  camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look);
  const k = set.key, fc = focus || look; k.intensity = c === 1 ? 1.4 : 3.0;
  k.target.position.copy(fc); k.position.copy(fc).add(V(-50, 110, 70)); k.target.updateMatrixWorld();
  Object.assign(k.shadow.camera, { left: -span, right: span, top: span, bottom: -span }); k.shadow.camera.updateProjectionMatrix();
  post.dof.focus = camera.position.distanceTo(focus); post.dof.aper = aper; post.dof.maxCoc = +(QS.get('coc') ?? 14);
}
function toScreen(p) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }

// —— 2D layer: badge, bubbles, subtitles ——
const ov = document.getElementById('ov'), g = ov.getContext('2d');
ov.width = W; ov.height = H;
function brickIcon(x, y, s = 1, col = '#f2cd37') {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.beginPath(); g.roundRect(0, 8, 58, 26, 5); g.fill();
  g.beginPath(); g.roundRect(7, 0, 18, 10, 3); g.roundRect(33, 0, 18, 10, 3); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 28, 58, 6); g.restore();
}
const pop = (t, t0) => { const u = seg(q(t), t0, t0 + .25); return u < 1 ? .55 + .55 * Math.sin(u * Math.PI * .75) : 1; };
// rich line: [{s, hi}] — hi parts sit on a yellow brick tile
function subtitle(parts, t, t0, y = H - 250) {
  const s = pop(t, t0); if (t < t0) return;
  g.save(); g.font = `62px ${FONT}`; g.textBaseline = 'middle';
  const pad = 26, ws = parts.map(p => g.measureText(p.s).width + (p.hi ? pad * 2 : 0)), tw = ws.reduce((a, b) => a + b, 0) + (parts.length - 1) * 10;
  const pw = tw + 140, ph = 112, fit = Math.min(1, (W - 60) / pw);
  g.translate(W / 2, y + ph / 2); g.scale(s * fit, s * fit); g.translate(-pw / 2, -ph / 2);
  g.fillStyle = 'rgba(18,20,26,.78)'; g.beginPath(); g.roundRect(0, 0, pw, ph, 56); g.fill();
  brickIcon(34, ph / 2 - 17, .85);
  let x = 104;
  parts.forEach((p, i) => {
    if (p.hi) {
      g.fillStyle = p.hi; g.beginPath(); g.roundRect(x, 14, ws[i], ph - 28, 14); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 8, 18, ws[i] - 16, 4);
      g.fillStyle = '#1b1d22'; g.fillText(p.s, x + pad, ph / 2 + 3);
    } else { g.fillStyle = '#fff'; g.fillText(p.s, x, ph / 2 + 3); }
    x += ws[i] + 10;
  });
  g.restore();
}
function badge(text, t, t0) {
  if (t < t0) return; const s = pop(t, t0);
  g.save(); g.font = `76px ${FONT}`; g.textBaseline = 'middle';
  const tw = g.measureText(text).width, pw = tw + 90, ph = 128;
  g.translate(W / 2, 190); g.scale(s, s); g.rotate(-.02);
  g.translate(-pw / 2, -ph / 2);
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
  g.fillStyle = '#c91a09'; g.beginPath(); g.roundRect(0, 0, pw, ph, 22); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#c91a09'; for (let i = 0; i < Math.floor(pw / 70); i++) { g.beginPath(); g.roundRect(30 + i * 70, -12, 40, 16, 5); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(14, 10, pw - 28, 6);
  g.fillStyle = '#fff'; g.fillText(text, 45, ph / 2 + 4);
  g.restore();
}
function bubble(text, t, t0, t1, anchor, side = 1, size = 64) {
  if (t < t0 || t >= t1) return; const s = pop(t, t0);
  const [ax, ay] = toScreen(anchor);
  g.save(); g.font = `${size}px ${FONT}`; g.textBaseline = 'middle';
  const tw = g.measureText(text).width, pw = tw + 70, ph = size * 1.7;
  const bx = clamp(ax + side * 40 - (side < 0 ? pw : 0), 30, W - 30 - pw), by = ay - ph - 120;
  g.translate(ax, ay); g.scale(s, s); g.translate(-ax, -ay);
  g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(bx, by, pw, ph, ph / 2); g.fill();
  const tx = clamp(ax, bx + 60, bx + pw - 60);
  g.beginPath(); g.moveTo(tx - 22, by + ph - 4); g.lineTo(ax + side * 10, ay - 40); g.lineTo(tx + 22, by + ph - 4); g.fill();
  g.shadowColor = 'transparent'; g.fillStyle = '#1b1d22'; g.fillText(text, bx + 35, by + ph / 2 + 3);
  g.restore();
}
function tag(text, x, y, col, t, t0) {
  if (t < t0) return; const s = pop(t, t0);
  g.save(); g.font = `58px ${FONT}`; g.textBaseline = 'middle'; const tw = g.measureText(text).width, pw = tw + 60, ph = 90;
  g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.beginPath(); g.roundRect(-pw / 2, -ph / 2, pw, ph, 18); g.fill();
  g.fillStyle = col; g.beginPath(); g.roundRect(-pw / 2 + 20, -ph / 2 - 12, 34, 14, 4); g.roundRect(pw / 2 - 54, -ph / 2 - 12, 34, 14, 4); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, 0, 4); g.restore();
}
const headOf = s => s.head.localToWorld(V(0, -.6, 2.4));
function hud(t, c) {
  g.clearRect(0, 0, W, H);
  if (c === 0) {
    badge('🚨 코스피 5,000 붕괴', t, 0);
    bubble('1만피 간다며…?', t, 1.5, 3, headOf(C1.sq), -1, 66);
    subtitle([{ s: '코스피' }, { s: '4,968', hi: '#f2cd37' }, { s: '💥' }], t, .3);
  } else if (c === 1) {
    tag('6월', W * .25, 230, '#e8a10c', t, 3.0); tag('지금', W * .75, 230, '#1d5fa8', t, 6.0);
    bubble('1만피 가즈아!', t, 3.3, 6.0, headOf(C2.L), 1, 58);
    subtitle([{ s: '고점 대비' }, { s: '-47%', hi: '#f2cd37' }, { s: '😇' }], t, 3.6);
  } else if (c === 2) {
    bubble('어디 가…', t, E.grab, 18, headOf(C3.hero), -1, 62);
    subtitle([{ s: '외국인' }, { s: '1조 4천억', hi: '#f2cd37' }, { s: '순매도 🏃‍♂️💨' }], t, 11.4);
  } else {
    subtitle([{ s: '❌ 패닉 손절·빚투' }, { s: '⭕ 비중 체크·적립 유지' }], t, 18.6, H - 200);
  }
}

function render(t) {
  const c = cutAt(t), tq = q(t);
  G.forEach((g, i) => g.visible = i === c);
  [cut1, cut2, cut3, cut4][c](tq);
  cam(t, c);
  post.composer.render();
  { const gl = renderer.getContext(), px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }   // wait for the GPU before the screenshot
  hud(t, c);
}

window.render = render; window.DUR = DUR;
window.EV = [
  ...[0, .45, .9].map(t => ({ t, type: 'siren' })), { t: E.crack, type: 'crack' }, { t: E.shock, type: 'gasp' },
  { t: E.fanfare, type: 'fanfare' }, { t: E.scratch, type: 'scratch' }, { t: E.cry, type: 'cry' }, { t: E.card1 + .45, type: 'thud' }, { t: E.card2 + .45, type: 'thud' },
  { t: E.march, type: 'march', d: 6 }, ...E.board.map(t => ({ t, type: 'board' })), { t: E.whoosh, type: 'whoosh' },
  ...E.stamps.map(t => ({ t, type: 'stamp' })), ...E.checks.map(t => ({ t, type: 'ding' })),
];
render(parseFloat(QS.get('t') ?? '2.5'));
window.READY = true;
