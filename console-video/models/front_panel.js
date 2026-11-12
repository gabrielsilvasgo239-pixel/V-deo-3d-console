// Painel frontal preto com faixa de LED ciano e botão de energia.
import * as THREE from 'three';
import { materials } from './materials.js';
import { rbox, mesh, part } from './util.js';

export function make_front_panel() {
  const M = materials(), g = new THREE.Group();
  const p = mesh(rbox(3.0, 0.22, 0.05, 0.02), M.glossBlack); g.add(p);
  const strip = mesh(new THREE.BoxGeometry(2.2, 0.014, 0.01), M.led); strip.position.set(-0.2, -0.04, 0.027); g.add(strip);
  const btn = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 32), M.steel);
  btn.rotation.x = Math.PI / 2; btn.position.set(1.25, 0.02, 0.03); g.add(btn);
  const usb = mesh(new THREE.BoxGeometry(0.12, 0.04, 0.02), M.rubber); usb.position.set(1.05, 0.02, 0.026); g.add(usb);
  return part(g, 'front_panel', 'Painel frontal');
}
