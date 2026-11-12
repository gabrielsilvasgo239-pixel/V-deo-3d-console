// Funções de animação: easings, encaixe com bounce e trilhas de câmera suaves.
import * as THREE from 'three';

export const clamp01 = x => Math.max(0, Math.min(1, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const range = (t, a, b) => clamp01((t - a) / (b - a));
export const easeOutCubic = x => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInOutCubic = x => (x = clamp01(x), x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutExpo = x => (x = clamp01(x), x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const smooth = x => (x = clamp01(x), x * x * (3 - 2 * x));

// Entrada "de cima" com ease-out e clique ao encaixar: passa 3% do alvo e volta.
export function dropIn(x, overshoot = 0.03) {
  x = clamp01(x);
  if (x < 0.75) return easeOutCubic(x / 0.75) * (1 + overshoot);
  const b = (x - 0.75) / 0.25;
  return 1 + overshoot * Math.cos(b * Math.PI * 1.5) * (1 - b);
}

// Trilha de keyframes com spline de Hermite (tangentes Catmull-Rom no tempo).
// keys: [{t, v: Vector3 | number}]
export function track(keys) {
  const isNum = typeof keys[0].v === 'number';
  const val = k => (isNum ? new THREE.Vector3(k.v, 0, 0) : k.v);
  const n = keys.length;
  const tang = keys.map((k, i) => {
    if (i === 0 || i === n - 1) return new THREE.Vector3();
    const a = keys[i - 1], b = keys[i + 1];
    return val(b).clone().sub(val(a)).divideScalar(b.t - a.t);
  });
  return t => {
    if (t <= keys[0].t) return isNum ? keys[0].v : val(keys[0]).clone();
    if (t >= keys[n - 1].t) return isNum ? keys[n - 1].v : val(keys[n - 1]).clone();
    let i = 0; while (t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1], h = b.t - a.t, s = (t - a.t) / h;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s,
          h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    const out = val(a).clone().multiplyScalar(h00)
      .addScaledVector(tang[i], h10 * h).addScaledVector(val(b), h01).addScaledVector(tang[i + 1], h11 * h);
    return isNum ? out.x : out;
  };
}
