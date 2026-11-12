// SoC: substrato + die de silício espelhado (CPU + GPU no mesmo chip).
import * as THREE from 'three';
import { materials } from './materials.js';
import { rbox, mesh, part } from './util.js';

export function make_soc() {
  const M = materials(), g = new THREE.Group();
  const sub = mesh(rbox(0.56, 0.035, 0.56, 0.01), M.substrate); sub.position.y = 0.0175; g.add(sub);
  // capacitores minúsculos no substrato
  const cg = new THREE.BoxGeometry(0.018, 0.01, 0.03);
  for (let i = 0; i < 12; i++) {
    const c = mesh(cg, M.ceramic); const a = i < 6 ? -0.22 : 0.22;
    c.position.set(a, 0.04, -0.15 + (i % 6) * 0.06); g.add(c);
  }
  const die = mesh(rbox(0.32, 0.02, 0.26, 0.004), M.silicon); die.position.y = 0.045; g.add(die);
  return part(g, 'soc', 'SoC (CPU + GPU)');
}
