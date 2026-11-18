// Greybox renderer for the spike. One instanced mesh per layer; station layers
// fade from ghost to solid with signal strength. Real art and the blend shader come later.
import * as THREE from 'three';
import { STATION_LAYERS, type LayerId, type Level } from '../sim/level';
import { isSolid } from '../sim/signal';
import type { StationId } from '../sim/stations';
import { TUNING, type World } from '../sim/world';

export const STATION_COLORS: Record<StationId, string> = {
  velvet: '#e0a040',
  riot: '#e04848',
  forecast: '#7fa3c4',
  rewind: '#a07ae0',
};
const BG: Record<StationId | 'static', THREE.Color> = {
  velvet: new THREE.Color('#2a1c10'),
  riot: new THREE.Color('#2a0e12'),
  forecast: new THREE.Color('#141c26'),
  rewind: new THREE.Color('#1c1430'),
  static: new THREE.Color('#121216'),
};

/** Visible height of the play area in tiles. Wider windows see more horizontally. */
const VIEW_HEIGHT_TILES = 14;
const FOV = 35;

interface LayerMesh {
  id: LayerId;
  mesh: THREE.InstancedMesh;
  mat: THREE.MeshStandardMaterial;
  solidLast: boolean | undefined;
}

export interface View {
  load(level: Level): void;
  render(world: World, alpha: number, frameDt: number): void;
  resize(): void;
}

export function createView(canvas: HTMLCanvasElement): View {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  const camDist = VIEW_HEIGHT_TILES / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));

  scene.add(new THREE.HemisphereLight('#fff4e0', '#202030', 1.4));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-6, 12, 10);
  scene.add(key);

  const box = new THREE.BoxGeometry(1, 1, 1.6);
  const spike = new THREE.ConeGeometry(0.35, 0.8, 4);
  const levelGroup = new THREE.Group();
  scene.add(levelGroup);

  const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(TUNING.playerW / 2, TUNING.playerH - TUNING.playerW, 6, 12),
    new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.5 }),
  );
  scene.add(player);

  const exitMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1, 0.3),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#9fffd0', emissiveIntensity: 1.2 }),
  );
  const tapeGeo = new THREE.BoxGeometry(0.5, 0.32, 0.12);
  const tapeMat = new THREE.MeshStandardMaterial({ color: '#ffe08a', emissive: '#ffcc33', emissiveIntensity: 0.6 });
  let tapes: THREE.Mesh[] = [];

  let layers: LayerMesh[] = [];
  let hazardMesh: THREE.InstancedMesh | undefined;
  const bg = new THREE.Color();
  const camPos = new THREE.Vector2();
  let time = 0;

  function clearLevel() {
    for (const l of layers) {
      levelGroup.remove(l.mesh);
      l.mesh.dispose();
      l.mat.dispose();
    }
    layers = [];
    if (hazardMesh) {
      levelGroup.remove(hazardMesh);
      hazardMesh.dispose();
      hazardMesh = undefined;
    }
    for (const t of tapes) levelGroup.remove(t);
    tapes = [];
    levelGroup.remove(exitMesh);
  }

  function tileMesh(cells: number[], mat: THREE.Material, level: Level) {
    const mesh = new THREE.InstancedMesh(box, mat, cells.length);
    const m = new THREE.Matrix4();
    cells.forEach((i, n) => {
      m.makeTranslation((i % level.width) + 0.5, Math.floor(i / level.width) + 0.5, 0);
      mesh.setMatrixAt(n, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  function load(level: Level) {
    clearLevel();
    const ids: LayerId[] = ['always', ...STATION_LAYERS, 'static'];
    for (const id of ids) {
      const cells: number[] = [];
      level.solid[id].forEach((v, i) => v && cells.push(i));
      if (cells.length === 0) continue;
      const color = id === 'always' ? '#8a8a94' : id === 'static' ? '#5a5a66' : STATION_COLORS[id];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, emissive: color, emissiveIntensity: 0 });
      const mesh = tileMesh(cells, mat, level);
      levelGroup.add(mesh);
      layers.push({ id, mesh, mat, solidLast: undefined });
    }

    const hz: number[] = [];
    level.hazards.forEach((v, i) => v && hz.push(i));
    if (hz.length) {
      const mat = new THREE.MeshStandardMaterial({ color: '#ff3355', emissive: '#ff1133', emissiveIntensity: 0.5 });
      // Hazards point up from the floor, or down when hung from a ceiling.
      const m = new THREE.Matrix4();
      const up = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
      const downQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, Math.PI / 4, 0));
      hazardMesh = new THREE.InstancedMesh(spike, mat, hz.length);
      hz.forEach((i, n) => {
        const x = i % level.width;
        const y = Math.floor(i / level.width);
        const below = y > 0 && level.solid.always[(y - 1) * level.width + x];
        const hanging = !below && y > level.height / 2;
        m.compose(new THREE.Vector3(x + 0.5, y + 0.4, 0), hanging ? downQ : up, new THREE.Vector3(1, 1, 1));
        hazardMesh!.setMatrixAt(n, m);
      });
      hazardMesh.instanceMatrix.needsUpdate = true;
      levelGroup.add(hazardMesh);
    }

    exitMesh.position.set(level.exit.x + 0.5, level.exit.y + 0.5, 0);
    levelGroup.add(exitMesh);
    tapes = level.tapes.map((t) => {
      const mesh = new THREE.Mesh(tapeGeo, tapeMat);
      mesh.position.set(t.x + 0.5, t.y + 0.5, 0);
      levelGroup.add(mesh);
      return mesh;
    });

    camPos.set(level.start.x, level.start.y);
  }

  function styleLayer(l: LayerMesh, strength: number, solid: boolean) {
    if (solid !== l.solidLast) {
      l.mat.transparent = !solid;
      l.mat.depthWrite = solid;
      l.mat.needsUpdate = true;
      l.solidLast = solid;
    }
    // Ghosts brighten as they approach the solid threshold so players can preview them.
    l.mat.opacity = solid ? 1 : 0.06 + 0.5 * Math.min(1, strength / 0.6);
    l.mat.emissiveIntensity = solid ? 0.12 : 0.5 * strength;
  }

  function render(world: World, alpha: number, frameDt: number) {
    time += frameDt;
    const s = world.strengths;
    let maxS = 0;
    bg.copy(BG.static);
    for (const id of STATION_LAYERS) {
      maxS = Math.max(maxS, s[id]);
      bg.lerp(BG[id], s[id]);
    }
    renderer.setClearColor(bg);
    for (const l of layers) {
      if (l.id === 'always') continue;
      if (l.id === 'static') styleLayer(l, world.staticOn ? 1 : 0.3 * (1 - maxS), world.staticOn);
      else styleLayer(l, s[l.id], isSolid(s[l.id]));
    }

    const p = world.player;
    const px = world.prevX + (p.x - world.prevX) * alpha + TUNING.playerW / 2;
    const py = world.prevY + (p.y - world.prevY) * alpha + TUNING.playerH / 2;
    player.position.set(px, py, 0);
    player.rotation.z = world.physics.gravity < 0 ? Math.PI : 0;

    exitMesh.rotation.y = time * 1.5;
    tapes.forEach((t, i) => {
      t.visible = !world.tapesFound.has(i);
      t.rotation.y = time * 2;
    });

    // Camera follows the player, eased, slightly ahead of where they look.
    const k = 1 - Math.exp(-frameDt * 6);
    camPos.x += (px - camPos.x) * k;
    camPos.y += (py + 1.5 - camPos.y) * k;
    camera.position.set(camPos.x, camPos.y, camDist);
    camera.lookAt(camPos.x, camPos.y, 0);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { load, render, resize };
}
