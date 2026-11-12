// Cabo flat: faixa fina e curva entre a fonte e a placa.
import * as THREE from 'three';
import { materials } from './materials.js';
import { mesh, part } from './util.js';

export function make_ribbon_cable() {
  const M = materials();
  const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.15, 0.12, 0.05),
               new THREE.Vector3(0.4, 0.1, 0.1), new THREE.Vector3(0.55, 0.0, 0.12)];
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 40, 0.012, 2, false);
  geo.scale(1, 1, 6);
  const g = new THREE.Group(); g.add(mesh(geo, M.ribbon));
  return part(g, 'ribbon', 'Cabo flat');
}
