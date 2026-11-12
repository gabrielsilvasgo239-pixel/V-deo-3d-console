// Heatpipes de cobre: tubos que levam o calor do SoC até as aletas.
import * as THREE from 'three';
import { materials } from './materials.js';
import { mesh, part } from './util.js';

export function make_heatpipes(count = 4) {
  const M = materials(), g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const z = -0.24 + i * 0.16;
    const pts = [
      new THREE.Vector3(-0.35, 0.0, z), new THREE.Vector3(0.25, 0.0, z),
      new THREE.Vector3(0.45, 0.06, z * 1.4), new THREE.Vector3(0.6, 0.16, z * 1.7),
      new THREE.Vector3(1.6, 0.16, z * 1.7),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = mesh(new THREE.TubeGeometry(curve, 80, 0.028, 16, false), M.copper);
    g.add(tube);
  }
  // bloco de contato (cold plate) de cobre
  const plate = mesh(new THREE.BoxGeometry(0.42, 0.03, 0.62), M.copper); plate.position.set(-0.12, -0.02, 0); g.add(plate);
  return part(g, 'heatpipes', 'Heatpipes de cobre');
}
