// Nuvem de grãos de areia (sílica), matéria-prima do silício.
import * as THREE from 'three';
import { materials } from './materials.js';
import { rng, part } from './util.js';

export function make_sand_cloud(count = 900, radius = 0.6, seed = 5) {
  const r = rng(seed);
  const mat = materials().sand.clone(); mat.transparent = true;
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0045, 0), mat, count);
  const homes = [];
  for (let i = 0; i < count; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = radius * (0.55 + 0.45 * Math.cbrt(r()));
    const s = Math.sqrt(1 - u * u);
    homes.push({ pos: new THREE.Vector3(s * Math.cos(th) * rad, u * rad * 0.5, s * Math.sin(th) * rad),
                 scale: 0.6 + r() * 1.0, seed: r() });
  }
  im.userData.homes = homes;
  const g = new THREE.Group(); g.add(im); g.userData.instanced = [im];
  return part(g, 'sand', 'Areia (sílica)');
}
