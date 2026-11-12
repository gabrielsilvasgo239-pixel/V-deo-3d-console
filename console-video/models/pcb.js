// Placa-mãe: PCB verde-escuro fosco com trilhas de cobre.
import * as THREE from 'three';
import { materials } from './materials.js';
import { mesh, part } from './util.js';

export const BOARD = { w: 2.7, d: 2.0, t: 0.035 };

export function make_mainboard() {
  const M = materials(), g = new THREE.Group();
  const mats = [M.pcbPlain, M.pcbPlain, M.pcb, M.pcbPlain, M.pcbPlain, M.pcbPlain];
  const b = mesh(new THREE.BoxGeometry(BOARD.w, BOARD.t, BOARD.d), mats); g.add(b);
  // furos de fixação com anel de cobre
  for (const [x, z] of [[1.2, 0.85], [-1.2, 0.85], [1.2, -0.85], [-1.2, -0.85]]) {
    const r = mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24), M.copper);
    r.rotation.x = Math.PI / 2; r.position.set(x, BOARD.t / 2, z); g.add(r);
  }
  return part(g, 'mainboard', 'Placa-mãe');
}
