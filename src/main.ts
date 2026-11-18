// Boot and frame loop. Placeholder scene until the week 1 spike lands:
// tune with the mouse wheel or Q / E and watch the station strengths change.
import * as THREE from 'three';
import { createFixedStepper } from './sim/fixedStep';
import { isStatic, strengths } from './sim/signal';
import { BAND_MAX, BAND_MIN, STATIONS, type StationId } from './sim/stations';

const STATION_COLORS: Record<StationId, THREE.Color> = {
  velvet: new THREE.Color('#d9902f'),
  riot: new THREE.Color('#d63a3a'),
  forecast: new THREE.Color('#6f8aa3'),
  rewind: new THREE.Color('#8e6bd1'),
};
const STATIC_COLOR = new THREE.Color('#2a2a30');

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const hud = document.querySelector<HTMLDivElement>('#hud');
const boot = document.querySelector<HTMLDivElement>('#boot');
if (!canvas || !hud || !boot) throw new Error('Missing #game, #hud or #boot in index.html');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
camera.position.set(0, 2, 24);

scene.add(new THREE.HemisphereLight('#fff4e0', '#202030', 1.2));
const sun = new THREE.DirectionalLight('#ffffff', 1.5);
sun.position.set(5, 10, 8);
scene.add(sun);

// Greybox: a floor and a few blocks on the gameplay plane (z = 0).
const blockMat = new THREE.MeshStandardMaterial({ color: '#8a8a94', roughness: 0.8 });
const block = (x: number, y: number, w: number, h: number) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), blockMat);
  m.position.set(x, y, 0);
  scene.add(m);
};
block(0, -4, 40, 1);
block(-6, -1.5, 3, 1);
block(2, 0.5, 3, 1);
block(9, 2.5, 3, 1);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Placeholder dial input. The real dial (momentum, max speed, fine-tune) is spike work in sim/.
let freq = 88.3;
const tune = (d: number) => {
  freq = Math.min(BAND_MAX, Math.max(BAND_MIN, freq + d));
};
window.addEventListener('wheel', (e) => tune(Math.sign(e.deltaY) * -0.1), { passive: true });
const keys = new Set<string>();
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));

const stepper = createFixedStepper();
const bg = new THREE.Color();
let last = performance.now();

function frame(now: number) {
  const dt = (now - last) / 1000;
  last = now;

  stepper.advance(dt, (step) => {
    if (keys.has('KeyQ')) tune(-4 * step);
    if (keys.has('KeyE')) tune(4 * step);
  });

  const s = strengths(freq, STATIONS);
  bg.copy(STATIC_COLOR);
  for (const st of STATIONS) bg.lerp(STATION_COLORS[st.id], s[st.id] * 0.6);
  renderer.setClearColor(bg);

  hud!.textContent =
    `${freq.toFixed(1)} MHz  ${isStatic(s) ? 'STATIC' : ''}\n` +
    STATIONS.map((st) => `${st.name} ${s[st.id].toFixed(2)}`).join('   ');

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame((t) => {
  last = t;
  frame(t);
  boot.classList.add('hidden');
});
