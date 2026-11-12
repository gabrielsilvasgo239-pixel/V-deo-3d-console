// Monta o console completo a partir das peças e calcula, para cada uma,
// a posição montada (home) e a posição na vista explodida (exploded).
import * as THREE from 'three';
import { rng } from './util.js';
import { make_bottom_shell, make_top_shell } from './shell.js';
import { make_front_panel } from './front_panel.js';
import { make_mainboard, BOARD } from './pcb.js';
import { make_soc } from './soc.js';
import { make_ram_chip, make_flash_chip, make_ssd_controller } from './memory.js';
import { make_inductor, make_capacitor } from './power_parts.js';
import { make_smd_field } from './smd.js';
import { make_heatsink } from './heatsink.js';
import { make_heatpipes } from './heatpipe.js';
import { make_fan } from './fan.js';
import { make_psu } from './psu.js';
import { make_rear_io } from './rear_io.js';
import { make_screw } from './screw.js';
import { make_ribbon_cable } from './ribbon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BOARD_Y = 0.16;                     // centro da placa
const BT = BOARD_Y + BOARD.t / 2;          // topo da placa

export function build_console({ explodeHeight = 1.0 } = {}) {
  const root = new THREE.Group(); root.name = 'console';
  const parts = [];      // { obj, home, homeQuat, exploded, explodedQuat, layer }
  const instanced = [];  // InstancedMesh com homes/exploded por instância
  const r = rng(42);

  function add(obj, pos, layer, { radial = 0.25, extra = V(0, 0, 0), rotY = 0, tilt = 0.12 } = {}) {
    obj.position.copy(pos); obj.rotation.y = rotY;
    root.add(obj);
    const home = pos.clone(), homeQuat = obj.quaternion.clone();
    const out = V(pos.x, 0, pos.z).multiplyScalar(radial);
    const exploded = home.clone().add(V(0, (layer + 0.7) * explodeHeight, 0)).add(out).add(extra);
    const e = new THREE.Euler((r() - 0.5) * tilt, rotY + (r() - 0.5) * tilt, (r() - 0.5) * tilt);
    const p = { obj, home, homeQuat, exploded, explodedQuat: new THREE.Quaternion().setFromEuler(e),
                layer, seed: r(), name: obj.name };
    parts.push(p);
    return p;
  }

  add(make_bottom_shell(), V(0, 0, 0), -0.7, { radial: 0, tilt: 0 });
  add(make_mainboard(), V(0, BOARD_Y, 0), 0, { radial: 0, tilt: 0.04 });
  add(make_psu(), V(-0.95, BT, 0.35), 0.75, { radial: 0.5 });
  add(make_ribbon_cable(), V(-0.55, BT + 0.12, 0.1), 0.55, { radial: 0.3 });
  add(make_soc(), V(0, BT, 0), 0.6, { radial: 0, tilt: 0.05 });
  [-0.33, -0.11, 0.11, 0.33].forEach((x, i) => {
    add(make_ram_chip(i), V(x, BT, -0.42), 0.6, { radial: 0.6 });
    add(make_ram_chip(i + 4), V(x, BT, 0.42), 0.6, { radial: 0.6 });
  });
  add(make_flash_chip(0), V(0.62, BT, -0.72), 0.55, { radial: 0.45 });
  add(make_flash_chip(1), V(1.0, BT, -0.72), 0.55, { radial: 0.45 });
  add(make_ssd_controller(), V(0.82, BT, -0.38), 0.55, { radial: 0.45 });
  for (let i = 0; i < 8; i++) {
    add(make_inductor(i), V(-1.12 + i * 0.115, BT, -0.82), 0.5, { radial: 0.5 });
    add(make_capacitor(i), V(-1.12 + i * 0.115, BT, -0.62), 0.5, { radial: 0.5 });
  }
  add(make_rear_io(), V(0.1, BT, -0.9), 0.4, { radial: 0.3, extra: V(0, 0, -0.5) });
  add(make_heatpipes(), V(-0.05, BT + 0.08, 0), 1.25, { radial: 0 });
  const hs = make_heatsink({ w: 1.0, d: 1.1 });
  add(hs, V(0, BT + 0.06, 0), 1.85, { radial: 0, tilt: 0.05 });
  const fan = make_fan();
  add(fan, V(1.0, BT + 0.22, 0.62), 1.6, { radial: 0.35 });
  [[1.2, 0.85], [-1.2, 0.85], [1.2, -0.85], [-1.2, -0.85]].forEach(([x, z], i) => {
    add(make_screw(i), V(x, BT + 0.01, z), 1.1, { radial: 0.15 });
  });
  [[0.45, 0.5], [-0.45, 0.5], [0.45, -0.5], [-0.45, -0.5]].forEach(([x, z], i) => {
    add(make_screw(i + 4), V(x, BT + 0.08, z), 2.5, { radial: 0.25 });
  });
  add(make_top_shell(), V(0, 0.3, 0), 3.0, { radial: 0, tilt: 0.06 });
  add(make_front_panel(), V(0, 0.3, 1.235), 1.2, { radial: 0, extra: V(0, 0, 0.9), tilt: 0.05 });

  // centenas de SMD: na vista explodida viram uma nuvem ao redor do console
  const smd = make_smd_field(380, 3, [[0, 0, 0.6, 0.6], [-0.95, 0.35, 0.45, 0.52], [0.8, -0.6, 0.4, 0.35],
                                      [-0.7, -0.72, 0.5, 0.18], [0.4, -0.9, 0.4, 0.12]]);
  smd.position.set(0, BT, 0); root.add(smd);
  for (const im of smd.userData.instanced) {
    im.userData.exploded = im.userData.homes.map(h => {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 1.0 + 1.6 * Math.cbrt(r());
      const s = Math.sqrt(1 - u * u);
      return { pos: V(s * Math.cos(th) * rad, 1.75 + u * rad * 0.85, s * Math.sin(th) * rad),
               rot: new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28) };
    });
    instanced.push(im);
  }

  const byName = Object.fromEntries(parts.map(p => [p.name, p]));
  return { root, parts, instanced, byName, fan, smd, BT };
}

// Aplica um estado de explosão: k=0 montado, k=1 explodido.
// kOf(p) permite atrasar cada peça (efeito cascata).
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(),
      _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Quaternion();
export function apply_explode(cons, kOf, t = 0, drift = 1) {
  for (const p of cons.parts) {
    const k = kOf(p);
    p.obj.position.lerpVectors(p.home, p.exploded, k);
    // flutuação suave no ar
    p.obj.position.y += Math.sin(t * 1.3 + p.seed * 20) * 0.025 * k * drift;
    p.obj.quaternion.slerpQuaternions(p.homeQuat, p.explodedQuat, k);
  }
  for (const im of cons.instanced) {
    const homes = im.userData.homes, ex = im.userData.exploded;
    for (let i = 0; i < homes.length; i++) {
      const h = homes[i], x = ex[i];
      const k = kOf({ seed: h.seed, layer: 1, instanced: true });
      _p.lerpVectors(h.pos, x.pos, k);
      _p.y += Math.sin(t * 1.1 + h.seed * 40) * 0.04 * k * drift;
      _e.setFromEuler(new THREE.Euler(x.rot.x * k + t * 0.3 * k, h.rotY + x.rot.y * k, x.rot.z * k));
      _m.compose(_p, _e, _s); im.setMatrixAt(i, _m);
    }
    im.instanceMatrix.needsUpdate = true;
  }
}
