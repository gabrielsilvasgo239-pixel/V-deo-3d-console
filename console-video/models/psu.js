// Fonte de alimentação interna: caixa de aço com grade perfurada.
import * as THREE from 'three';
import { materials } from './materials.js';
import { rbox, mesh, part } from './util.js';

export function make_psu() {
  const M = materials(), g = new THREE.Group();
  const box = mesh(rbox(0.8, 0.26, 0.95, 0.015), M.aluminum); box.position.y = 0.13; g.add(box);
  const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 8), M.rubber, 108);
  const m4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < 9; i++) for (let j = 0; j < 12; j++) {
    m4.makeTranslation(-0.3 + i * 0.075, 0.262, -0.38 + j * 0.07); holes.setMatrixAt(k++, m4);
  }
  g.add(holes);
  const plug = mesh(new THREE.BoxGeometry(0.16, 0.1, 0.04), M.rubber); plug.position.set(0.2, 0.13, -0.49); g.add(plug);
  return part(g, 'psu', 'Fonte de energia');
}
