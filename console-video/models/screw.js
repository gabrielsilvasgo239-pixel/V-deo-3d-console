// Parafuso Phillips de aço.
import * as THREE from 'three';
import { materials } from './materials.js';
import { mesh, part } from './util.js';

let geos;
export function make_screw(i = 0) {
  const M = materials(), g = new THREE.Group();
  geos ||= {
    head: new THREE.CylinderGeometry(0.035, 0.035, 0.018, 20),
    shaft: new THREE.CylinderGeometry(0.014, 0.012, 0.12, 12),
    slot: new THREE.BoxGeometry(0.045, 0.006, 0.008),
  };
  const head = mesh(geos.head, M.steel); head.position.y = 0.009; g.add(head);
  const shaft = mesh(geos.shaft, M.steel); shaft.position.y = -0.06; g.add(shaft);
  for (const r of [0, Math.PI / 2]) {
    const s = mesh(geos.slot, M.rubber, { cast: false }); s.rotation.y = r; s.position.y = 0.017; g.add(s);
  }
  return part(g, `screw_${i}`, 'Parafuso');
}
