// Componentes de energia (VRM): indutores e capacitores eletrolíticos/de polímero.
import * as THREE from 'three';
import { materials } from './materials.js';
import { rbox, mesh, part } from './util.js';

export function make_inductor(i = 0) {
  const M = materials(), g = new THREE.Group();
  const b = mesh(rbox(0.1, 0.07, 0.1, 0.008), M.ferrite); b.position.y = 0.035; g.add(b);
  return part(g, `inductor_${i}`, 'Indutor (VRM)');
}

export function make_capacitor(i = 0) {
  const M = materials(), g = new THREE.Group();
  const c = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 20), M.capBlue); c.position.y = 0.045; g.add(c);
  const top = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.004, 20), M.steel); top.position.y = 0.092; g.add(top);
  return part(g, `capacitor_${i}`, 'Capacitor');
}
