// Centenas de componentes SMD (resistores/capacitores minúsculos) espalhados na placa.
// Retorna um InstancedMesh por tipo + as posições "montadas" de cada instância,
// para que a cena possa explodir cada componente individualmente.
import * as THREE from 'three';
import { materials } from './materials.js';
import { rng, part } from './util.js';
import { BOARD } from './pcb.js';

export function make_smd_field(count = 360, seed = 3, keepOut = []) {
  const M = materials(), r = rng(seed);
  const kinds = [
    { geo: new THREE.BoxGeometry(0.03, 0.012, 0.016), mat: M.ceramic },
    { geo: new THREE.BoxGeometry(0.03, 0.01, 0.016), mat: M.epoxy },
    { geo: new THREE.BoxGeometry(0.05, 0.016, 0.03), mat: M.epoxy },
  ];
  const homes = kinds.map(() => []);
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 20) {
    const x = (r() - 0.5) * (BOARD.w - 0.15), z = (r() - 0.5) * (BOARD.d - 0.15);
    if (keepOut.some(([cx, cz, hw, hd]) => Math.abs(x - cx) < hw && Math.abs(z - cz) < hd)) continue;
    const k = r() < 0.55 ? 0 : r() < 0.7 ? 1 : 2;
    homes[k].push({ pos: new THREE.Vector3(x, 0.0, z), rotY: r() < 0.5 ? 0 : Math.PI / 2, seed: r() });
    n++;
  }
  const meshes = kinds.map((k, i) => {
    const im = new THREE.InstancedMesh(k.geo, k.mat, homes[i].length);
    im.castShadow = true; im.receiveShadow = true;
    im.userData.homes = homes[i];
    return im;
  });
  const g = new THREE.Group(); meshes.forEach(m => g.add(m));
  g.userData.instanced = meshes;
  return part(g, 'smd', 'Componentes SMD');
}
