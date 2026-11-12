// Chips de memória (RAM GDDR) e de armazenamento (flash do SSD).
import * as THREE from 'three';
import { materials } from './materials.js';
import { rbox, mesh, part } from './util.js';

export function make_ram_chip(i = 0) {
  const M = materials(), g = new THREE.Group();
  const c = mesh(rbox(0.2, 0.025, 0.14, 0.006), M.epoxy); c.position.y = 0.0125; g.add(c);
  const dot = mesh(new THREE.CircleGeometry(0.01, 12), M.steel, { cast: false });
  dot.rotation.x = -Math.PI / 2; dot.position.set(-0.08, 0.026, -0.05); g.add(dot);
  return part(g, `ram_${i}`, 'Memória RAM');
}

export function make_flash_chip(i = 0) {
  const M = materials(), g = new THREE.Group();
  const c = mesh(rbox(0.26, 0.022, 0.18, 0.006), M.epoxy); c.position.y = 0.011; g.add(c);
  return part(g, `flash_${i}`, 'SSD (memória flash)');
}

export function make_ssd_controller() {
  const M = materials(), g = new THREE.Group();
  const c = mesh(rbox(0.16, 0.02, 0.16, 0.005), M.epoxy); c.position.y = 0.01; g.add(c);
  const lid = mesh(new THREE.BoxGeometry(0.1, 0.004, 0.1), M.steel); lid.position.y = 0.022; g.add(lid);
  return part(g, 'ssd_controller', 'Controlador do SSD');
}
