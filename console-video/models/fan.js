// Ventoinha tipo blower: moldura, hub e pás curvas (array radial).
import * as THREE from 'three';
import { materials } from './materials.js';
import { mesh, part } from './util.js';

export function make_fan({ r = 0.42, blades = 11 } = {}) {
  const M = materials(), g = new THREE.Group();
  const frame = mesh(new THREE.TorusGeometry(r + 0.03, 0.03, 10, 64), M.blackPlastic);
  frame.rotation.x = Math.PI / 2; g.add(frame);
  const floor = mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.015, 64), M.blackPlastic);
  floor.position.y = -0.06; g.add(floor);
  const rotor = new THREE.Group(); rotor.name = 'rotor';
  const hub = mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.1, 40), M.blackPlastic); rotor.add(hub);
  const cap = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 32), M.steel); cap.position.y = 0.056; rotor.add(cap);
  // pá curva: forma 2D extrudada
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(0.12, 0.05, 0.27, 0.0);
  s.lineTo(0.27, 0.025); s.quadraticCurveTo(0.12, 0.08, 0, 0.03); s.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: false });
  bladeGeo.rotateX(Math.PI / 2); bladeGeo.translate(0.12, 0.045, 0);
  for (let i = 0; i < blades; i++) {
    const b = mesh(bladeGeo, M.blackPlastic);
    b.rotation.y = (i / blades) * Math.PI * 2; rotor.add(b);
  }
  g.add(rotor);
  g.userData.rotor = rotor;
  return part(g, 'fan', 'Ventoinha');
}
