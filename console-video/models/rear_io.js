// Conectores traseiros genéricos (vídeo, USB, rede) montados na placa.
import * as THREE from 'three';
import { materials } from './materials.js';
import { mesh, part } from './util.js';

export function make_rear_io() {
  const M = materials(), g = new THREE.Group();
  const specs = [[0.2, 0.07, 0.18, 0.0], [0.13, 0.06, 0.16, 0.25], [0.13, 0.06, 0.16, 0.42], [0.17, 0.12, 0.18, 0.62]];
  for (const [w, h, d, x] of specs) {
    const s = mesh(new THREE.BoxGeometry(w, h, d), M.steel); s.position.set(x, h / 2, 0); g.add(s);
    const hole = mesh(new THREE.BoxGeometry(w * 0.7, h * 0.45, 0.01), M.rubber); hole.position.set(x, h / 2, -d / 2 - 0.004); g.add(hole);
  }
  return part(g, 'rear_io', 'Conectores traseiros');
}
