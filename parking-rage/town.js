// 작은 동네: 3×3 블록, 저층·중층 건물(창문 텍스처), 도로·차선·횡단보도, 가로수, 차, 사람. 단위 = 미터.
import * as THREE from 'three';
import { mulberry, hash } from '/core/lib.js';
import { M, mesh, box, grp, canvasTex, signBoard } from './lib3d.js';

export const ROADS = [-40, 0, 40], RW = 9, SWK = 3;   // 도로 중심선, 도로 폭, 보도 폭
const FAC = ['#f1e7d6', '#ecd9bb', '#e3c99b', '#d9886a', '#c96e55', '#f0d38a', '#dfe7e1', '#b9d2cf', '#cfd6de', '#e8b49c', '#f5efe4', '#a8bfd6'];
const ROOF = ['#8e8c88', '#a29e96', '#77736e', '#b9b4aa'];
const TILE = ['#c0583d', '#a84a36', '#cf7350', '#6b7480'];
const CARC = ['#e8473b', '#f2c230', '#2f7fd8', '#ffffff', '#ffffff', '#3a3f48', '#8fd0c8', '#f08c3a', '#c9ced6', '#1f9e5c'];
const SHIRT = ['#e8473b', '#f2c230', '#2f7fd8', '#ffffff', '#f08cb0', '#1f9e5c', '#7a5cd6', '#f08c3a', '#30343c'];

function facadeTex(w, h, wall, R, shop) {
  const floors = Math.max(1, Math.round(h / 3.2)), bays = Math.max(1, Math.round(w / 2.6));
  const px = 22, cw = Math.max(64, Math.round(w * px)), ch = Math.max(64, Math.round(h * px));
  return canvasTex(cw, ch, g => {
    g.fillStyle = wall; g.fillRect(0, 0, cw, ch);
    const fh = ch / floors, bw = cw / bays, win = ['#3d5a78', '#557a9c', '#2e4660'][Math.floor(R() * 3)];
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
      const gf = f === floors - 1;
      if (gf && shop) continue;
      const x = b * bw + bw * .2, y = f * fh + fh * .22, ww = bw * .6, hh = fh * .55;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 2, y - 2, ww + 4, hh + 4);
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, '#c9e4f5'); gr.addColorStop(.5, win); gr.addColorStop(1, '#1d2c3c');
      g.fillStyle = gr; g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x, y + hh, ww, 2);
    }
    if (shop) {   // 1층 상점: 유리 + 차양
      const y = (floors - 1) * fh;
      g.fillStyle = '#2b3442'; g.fillRect(0, y + fh * .25, cw, fh * .75);
      g.fillStyle = '#f7e2a8'; for (let b = 0; b < bays; b++) g.fillRect(b * bw + 3, y + fh * .32, bw - 6, fh * .6);
      g.fillStyle = shop; g.fillRect(0, y, cw, fh * .25);
      g.fillStyle = 'rgba(255,255,255,.7)'; for (let x = 0; x < cw; x += 12) g.fillRect(x, y, 6, fh * .25);
    }
    const gr = g.createLinearGradient(0, ch * .6, 0, ch); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,30,20,.22)');   // 땅 쪽 때
    g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
  });
}
export function building(w, d, h, R, o = {}) {
  const wall = o.wall || FAC[Math.floor(R() * FAC.length)];
  const shop = o.shop ?? (R() < .5 ? ['#e8473b', '#2f7fd8', '#1f9e5c', '#f2c230'][Math.floor(R() * 4)] : null);
  const tA = facadeTex(w, h, wall, R, shop), tB = facadeTex(d, h, wall, R, shop);
  const mA = new THREE.MeshStandardMaterial({ map: tA, roughness: .8 }), mB = new THREE.MeshStandardMaterial({ map: tB, roughness: .8 });
  const roof = M(o.roof || ROOF[Math.floor(R() * ROOF.length)]);
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mB, mB, roof, roof, mA, mA]); b.position.y = h / 2; b.castShadow = b.receiveShadow = true;
  const g = grp(b);
  if (o.pitched) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.01, Math.max(w, d) * .74, h * .35, 4), M(TILE[Math.floor(R() * TILE.length)]));
    r.rotation.y = Math.PI / 4; r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); r.position.y = h + h * .175; r.castShadow = true; g.add(r);
  } else {   // 옥상 설비
    g.add(box(w + .3, .5, d + .3, '#d8d2c6', 0, h + .25, 0)); g.children[g.children.length - 1].scale.set(1, 1, 1);
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) g.add(box(1 + R() * 1.5, .8 + R(), 1 + R() * 1.5, R() < .5 ? '#c9ced6' : '#9aa3ad', (R() - .5) * (w - 3), h + .9, (R() - .5) * (d - 3)));
    if (R() < .4) { const tk = mesh(new THREE.CylinderGeometry(.9, .9, 1.6, 16), M('#e6e0d4'), (R() - .5) * (w - 3), h + 1.3, (R() - .5) * (d - 3)); g.add(tk); }
  }
  return g;
}
const tree = (R) => {
  const s = .8 + R() * .5;
  return grp(mesh(new THREE.CylinderGeometry(.15, .2, 2 * s, 8), M('#6b4a32'), 0, s, 0), mesh(new THREE.IcosahedronGeometry(1.6 * s, 2), M(['#3faa3c', '#56c046', '#2f9a48'][Math.floor(R() * 3)], { roughness: .8 }), 0, 2.4 * s, 0));
};

// lots: [{x,z,w,d,h,opts}] 를 직접 지정하는 특수 건물 외에 블록을 무작위로 채운다
export function buildTown(scene, o = {}) {
  const R = mulberry(o.seed || 7), root = new THREE.Group(); scene.add(root);
  const S = o.size || 60;
  // 땅과 도로
  const ground = mesh(new THREE.PlaneGeometry(S * 2 + 60, S * 2 + 60), M('#5b5f66', { roughness: .95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.castShadow = false; root.add(ground);
  const mark = M('#f4f1e8', { roughness: .9 }), yellow = M('#f2c230');
  for (const c of ROADS) for (const ax of ['x', 'z']) {
    for (let s = -S - 20; s < S + 20; s += 6) {   // 중앙 점선
      if (ROADS.some(r => Math.abs(s - r) < RW)) continue;
      const m = mesh(new THREE.PlaneGeometry(ax === 'x' ? 3 : .25, ax === 'x' ? .25 : 3), yellow); m.rotation.x = -Math.PI / 2; m.castShadow = false;
      m.position.set(ax === 'x' ? s : c, .02, ax === 'x' ? c : s); root.add(m);
    }
    for (const r2 of ROADS) for (const side of [-1, 1]) {   // 횡단보도
      for (let k = -3; k <= 3; k++) {
        const m = mesh(new THREE.PlaneGeometry(ax === 'x' ? 2.6 : .55, ax === 'x' ? .55 : 2.6), mark); m.rotation.x = -Math.PI / 2; m.castShadow = false;
        const along = r2 + side * (RW / 2 + 1.6), across = c + k * 1.15;
        m.position.set(ax === 'x' ? along : across, .02, ax === 'x' ? across : along); root.add(m);
      }
    }
  }
  // 블록
  const edges = [-S, ...ROADS, S];
  const lots = [], blocks = [];
  for (let i = 0; i < edges.length - 1; i++) for (let j = 0; j < edges.length - 1; j++) {
    const x0 = edges[i] + (ROADS.includes(edges[i]) ? RW / 2 : 0), x1 = edges[i + 1] - (ROADS.includes(edges[i + 1]) ? RW / 2 : 0);
    const z0 = edges[j] + (ROADS.includes(edges[j]) ? RW / 2 : 0), z1 = edges[j + 1] - (ROADS.includes(edges[j + 1]) ? RW / 2 : 0);
    const blk = { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 }; blocks.push(blk);
    const curb = box(x1 - x0, .18, z1 - z0, '#cfcabf', blk.cx, .09, blk.cz); curb.castShadow = false; root.add(curb);
    const special = (o.special || []).find(s => s.x > x0 && s.x < x1 && s.z > z0 && s.z < z1);
    const inner = { x0: x0 + SWK, x1: x1 - SWK, z0: z0 + SWK, z1: z1 - SWK };
    if (special && special.kind === 'park') {
      const gr = box(inner.x1 - inner.x0, .25, inner.z1 - inner.z0, '#4cb54a', blk.cx, .2, blk.cz); gr.castShadow = false; root.add(gr);
      for (let k = 0; k < 10; k++) { const t = tree(R); t.position.set(inner.x0 + 2 + R() * (inner.x1 - inner.x0 - 4), .3, inner.z0 + 2 + R() * (inner.z1 - inner.z0 - 4)); if (!special.clear || Math.hypot(t.position.x - special.clear[0], t.position.z - special.clear[1]) > special.clear[2]) root.add(t); }
      continue;
    }
    // 2×2 필지
    const res = (o.residential || (() => false))(blk.cx, blk.cz);
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const lx0 = inner.x0 + a * (inner.x1 - inner.x0) / 2, lx1 = inner.x0 + (a + 1) * (inner.x1 - inner.x0) / 2;
      const lz0 = inner.z0 + b * (inner.z1 - inner.z0) / 2, lz1 = inner.z0 + (b + 1) * (inner.z1 - inner.z0) / 2;
      const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2;
      if ((o.skip || []).some(s => Math.abs(s[0] - cx) < (lx1 - lx0) / 2 && Math.abs(s[1] - cz) < (lz1 - lz0) / 2)) continue;
      const w = (lx1 - lx0) - 2 - R() * 3, d = (lz1 - lz0) - 2 - R() * 3;
      const h = res ? 6 + R() * 4 : 9 + R() * 12;
      const bd = building(w, d, h, R, { pitched: res && R() < .8, shop: res ? null : undefined });
      bd.position.set(cx, .18, cz); root.add(bd); lots.push({ cx, cz, w, d, h, obj: bd });
    }
    // 가로수
    for (let k = 0; k < 6; k++) {
      const side = k % 4, u = R();
      const p = side === 0 ? [x0 + 1, z0 + u * (z1 - z0)] : side === 1 ? [x1 - 1, z0 + u * (z1 - z0)] : side === 2 ? [x0 + u * (x1 - x0), z0 + 1] : [x0 + u * (x1 - x0), z1 - 1];
      const t = tree(R); t.position.set(p[0], .18, p[1]); t.scale.setScalar(.8); root.add(t);
    }
  }
  return { root, lots, blocks };
}

// 차: 도로 위 차선을 따라 움직인다. simT(초)를 받아 위치 갱신
export function makeCars(root, n = 26, seed = 3, keep = () => true) {
  const R = mulberry(seed), cars = [];
  const L = 160;
  for (let i = 0; i < n; i++) {
    const road = ROADS[Math.floor(R() * 3)], ax = R() < .5 ? 'x' : 'z', dir = R() < .5 ? 1 : -1;
    const col = CARC[Math.floor(R() * CARC.length)], big = R() < .15;
    const len = big ? 7 : 4.2, wd = big ? 2.3 : 1.8;
    const body = box(len, big ? 2.4 : 1.0, wd, M(col, { roughness: .35, metalness: .1 }), 0, big ? 1.4 : .75, 0);
    const cab = box(big ? len * .95 : len * .55, big ? .6 : .65, wd * .92, M('#1b2430', { roughness: .15, metalness: .3 }), big ? 0 : -.2, big ? 2.1 : 1.55, 0);
    const shadow = mesh(new THREE.PlaneGeometry(len * 1.1, wd * 1.2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .25, depthWrite: false }), 0, .03, 0); shadow.rotation.x = -Math.PI / 2; shadow.castShadow = false;
    const brake = box(.1, .25, wd * .8, M('#ff3020', { emissive: '#ff2010', emissiveIntensity: .8 }), -len / 2, .9, 0);
    if (!keep(road, ax)) continue;
    const g = grp(body, cab, shadow, brake); root.add(g);
    cars.push({ g, road, ax, dir, off: R() * L, v: 7 + R() * 5, lane: dir * 2.2 });
  }
  function update(simT) {
    for (const c of cars) {
      let s = ((c.off + c.v * simT) % L + L) % L - L / 2;
      s *= c.dir;
      if (c.ax === 'x') { c.g.position.set(s, .18, c.road + c.lane); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI; }
      else { c.g.position.set(c.road - c.lane, .18, s); c.g.rotation.y = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
    }
  }
  return { cars, update };
}
// 사람: 보도를 걷는 작은 캡슐 (모형 철도 인형)
export function makeWalkers(root, n = 60, seed = 5) {
  const R = mulberry(seed), ws = [];
  const geo = new THREE.CapsuleGeometry(.28, .9, 4, 8), head = new THREE.SphereGeometry(.22, 10, 8);
  for (let i = 0; i < n; i++) {
    const road = ROADS[Math.floor(R() * 3)], ax = R() < .5 ? 'x' : 'z', side = R() < .5 ? 1 : -1, dir = R() < .5 ? 1 : -1;
    const b = new THREE.Mesh(geo, M(SHIRT[Math.floor(R() * SHIRT.length)])); b.position.y = .75; b.castShadow = true;
    const h = new THREE.Mesh(head, M('#f0c9a0')); h.position.y = 1.5; h.castShadow = true;
    const g = grp(b, h); root.add(g);
    ws.push({ g, road, ax, off: R() * 160, v: (.9 + R() * .6) * dir, c: side * (RW / 2 + 1.5) });
  }
  function update(simT) {
    for (const w of ws) {
      const s = ((w.off + w.v * simT) % 160 + 160) % 160 - 80;
      if (w.ax === 'x') w.g.position.set(s, .18, w.road + w.c); else w.g.position.set(w.road + w.c, .18, s);
    }
  }
  return { ws, update };
}
