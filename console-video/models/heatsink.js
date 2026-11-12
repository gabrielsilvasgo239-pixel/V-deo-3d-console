// Dissipador de alumínio escovado: base + array de aletas.
import * as THREE from 'three';
import { materials } from './materials.js';
import { rbox, mesh, part } from './util.js';

export function make_heatsink({ w = 1.2, d = 1.0, fins = 26, h = 0.26 } = {}) {
  const M = materials(), g = new THREE.Group();
  const base = mesh(rbox(w * 0.7, 0.05, d * 0.7, 0.01), M.aluminum); base.position.y = 0.025; g.add(base);
  const finGeo = new THREE.BoxGeometry(0.018, h, d);
  const step = w / (fins - 1);
  for (let i = 0; i < fins; i++) {
    const f = mesh(finGeo, M.aluminum);
    f.position.set(-w / 2 + i * step, 0.05 + h / 2, 0); g.add(f);
  }
  // barras de amarração
  for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) {
    const bar = mesh(new THREE.BoxGeometry(w + 0.02, 0.02, 0.02), M.aluminum);
    bar.position.set(0, 0.05 + h - 0.01, z); g.add(bar);
  }
  return part(g, 'heatsink', 'Dissipador de alumínio');
}
