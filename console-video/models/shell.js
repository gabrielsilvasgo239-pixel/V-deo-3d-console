// Carcaça do console (design original): base e tampa em plástico branco fosco.
import * as THREE from 'three';
import { materials } from './materials.js';
import { rbox, mesh, part } from './util.js';

export const DIM = { w: 3.2, d: 2.4, h: 0.72 };

export function make_bottom_shell() {
  const M = materials(), g = new THREE.Group();
  const { w, d } = DIM, t = 0.05, wall = 0.3;
  const floor = mesh(rbox(w, t, d, 0.025), M.whitePlastic); floor.position.y = t / 2; g.add(floor);
  const sides = [[w, wall, t, 0, d / 2 - t / 2], [w, wall, t, 0, -d / 2 + t / 2],
                 [t, wall, d, w / 2 - t / 2, 0], [t, wall, d, -w / 2 + t / 2, 0]];
  for (const [sx, sy, sz, x, z] of sides) {
    const s = mesh(rbox(sx, sy, sz, 0.02), M.whitePlastic); s.position.set(x, sy / 2, z); g.add(s);
  }
  // pés de borracha
  for (const [x, z] of [[1.3, 0.95], [-1.3, 0.95], [1.3, -0.95], [-1.3, -0.95]]) {
    const f = mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.04, 24), M.rubber);
    f.position.set(x, -0.02, z); g.add(f);
  }
  // torres de parafuso
  for (const [x, z] of [[1.2, 0.85], [-1.2, 0.85], [1.2, -0.85], [-1.2, -0.85]]) {
    const b = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 16), M.whitePlastic);
    b.position.set(x, 0.1, z); g.add(b);
  }
  return part(g, 'bottom_shell', 'Carcaça inferior');
}

export function make_top_shell() {
  const M = materials(), g = new THREE.Group();
  const { w, d } = DIM, t = 0.07, skirt = 0.28;
  const top = mesh(rbox(w + 0.04, t, d + 0.04, 0.035, 4), M.whitePlastic);
  top.position.y = skirt; g.add(top);
  for (const [sx, sz, x, z] of [[w + 0.04, 0.05, 0, d / 2 - 0.005], [w + 0.04, 0.05, 0, -d / 2 + 0.005],
                                [0.05, d, w / 2 - 0.005, 0], [0.05, d, -w / 2 + 0.005, 0]]) {
    const s = mesh(rbox(sx, skirt, sz, 0.02), M.whitePlastic); s.position.set(x, skirt / 2, z); g.add(s);
  }
  // painel de ventilação: placa grafite perfurada (grade instanciada de furos)
  const vent = mesh(rbox(1.15, 0.012, 1.15, 0.05), M.blackPlastic);
  vent.position.set(0.75, skirt + t / 2 + 0.001, -0.15); g.add(vent);
  const holeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.014, 10);
  const holes = new THREE.InstancedMesh(holeGeo, M.rubber, 400);
  const m4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) {
    const x = -0.5 + i * (1 / 19) + (j % 2 ? 0.025 : 0), z = -0.5 + j * (1 / 19);
    m4.makeTranslation(0.75 + x, skirt + t / 2 + 0.004, -0.15 + z); holes.setMatrixAt(k++, m4);
  }
  g.add(holes);
  // sulco decorativo + logotipo genérico (círculo em relevo, sem marca)
  const groove = mesh(new THREE.BoxGeometry(w * 0.92, 0.006, 0.02), M.blackPlastic, { cast: false });
  groove.position.set(0, skirt + t / 2 + 0.001, d / 2 - 0.22); g.add(groove);
  const ring = mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 40), M.blackPlastic);
  ring.rotation.x = Math.PI / 2; ring.position.set(-0.9, skirt + t / 2, -0.2); g.add(ring);
  return part(g, 'top_shell', 'Tampa superior');
}
