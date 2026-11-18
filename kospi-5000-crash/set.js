// The real desk: walnut top, studio HDRI, softboxes, a tea set and a desk lamp far behind (blurred by the lens).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const PH = '/core/assets/polyhaven/';
export const M = 125;   // 1 m = 125 studs

export async function buildSet(scene) {
  const hdr = await new RGBELoader().loadAsync(PH + 'photo_studio_loft_hall_2k.hdr');
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; scene.background = hdr;
  scene.backgroundBlurriness = .6; scene.backgroundIntensity = .2; scene.environmentIntensity = .5;
  scene.environmentRotation.y = scene.backgroundRotation.y = 1.2;

  const tl = new THREE.TextureLoader(), tex = (f, srgb) => { const t = tl.load(PH + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.5, 3.5); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: tex('walnut_diff.jpg', true), normalMap: tex('walnut_nor.jpg'), roughnessMap: tex('walnut_rough.jpg'), roughness: 1 }));
  desk.rotation.x = -Math.PI / 2; desk.position.set(0, 0, -100); desk.receiveShadow = true; scene.add(desk);

  const key = new THREE.DirectionalLight('#fff4e8', 3.0); key.position.set(-50, 110, 70); key.target.position.set(0, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 10, far: 400 }); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#cfe0ff', .5); fill.position.set(60, 40, -50); scene.add(fill);
  RectAreaLightUniformsLib.init();
  const box = (col, I, w, h, p, at) => { const l = new THREE.RectAreaLight(col, I, w, h); l.position.set(...p); l.lookAt(...at); scene.add(l); return l; };
  box('#fff6ee', 5, 60, 40, [-40, 50, 60], [0, 8, 0]);
  box('#e4eeff', 8, 60, 30, [45, 45, -60], [0, 8, 0]);
  box('#fff6ee', 3, 50, 30, [20, 60, 50], [0, 10, 0]);

  const gl = new GLTFLoader();
  const load = async n => (await gl.loadAsync(`${PH}${n}/${n}.gltf`)).scene;
  const tea = await load('tea_set_01');
  const keep = { tea_set_01_teapot_01: [-40, -70, .6], tea_set_01_teapot_01_lid: [-40, -70, .6], tea_set_01_cup_small_01: [38, -55, 2.4], tea_set_01_saucer_circular_04: [38, -55, 0] };
  const dead = [];
  tea.traverse(o => { if (!o.name.startsWith('tea_set_01_')) return; const k = keep[o.name]; if (!k) dead.push(o); else { o.position.set(k[0] / M, o.position.y + (o.name.includes('cup_small') ? .012 : 0), k[1] / M); o.rotation.y = k[2]; } });
  dead.forEach(o => o.parent.remove(o));
  tea.scale.setScalar(M); scene.add(tea);
  const lamp = await load('desk_lamp_arm_01'); lamp.scale.setScalar(M); lamp.position.set(70, 0, -95); lamp.rotation.y = -2.2; scene.add(lamp);
  for (const o of [tea, lamp]) o.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  return { key };
}
