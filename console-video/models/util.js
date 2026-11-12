// Utilitários de modelagem procedural.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function rbox(w, h, d, r = 0.02, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999);
}
export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
// marca um objeto como "peça" (nome interno + rótulo para etiqueta)
export function part(obj, name, label = name) {
  obj.name = name;
  obj.userData.part = { name, label };
  return obj;
}
// gerador pseudo-aleatório determinístico (renders reproduzíveis)
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
// array linear de cópias (como o modificador Array do Blender)
export function arrayOf(make, count, step) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const o = make(i);
    o.position.addScaledVector(step, i - (count - 1) / 2);
    g.add(o);
  }
  return g;
}
