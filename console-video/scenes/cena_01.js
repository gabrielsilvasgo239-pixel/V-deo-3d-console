// Cena 1 — Abertura (gancho)
// Console branco girando -> explode em vista explodida -> câmera atravessa as peças
// -> macro no silício (com grãos de areia) -> recua para a vista explodida completa.
import * as THREE from 'three';
import { build_console, apply_explode } from '../models/console.js';
import { make_sand_cloud } from '../models/sand.js';
import { track, range, easeOutCubic, easeOutExpo, smooth } from '../render/anim.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
let C, sand, T, camPos, camTgt, socDie;

export default {
  setup(ctx) {
    C = build_console({ explodeHeight: 0.95 });
    ctx.scene.add(C.root);
    sand = make_sand_cloud(650, 0.5);
    ctx.scene.add(sand);

    const D = ctx.duration;
    const tMil = ctx.wordTime('mil') ?? D * 0.22;
    const tAreia = ctx.wordTime('areia') ?? D * 0.55;
    const tHoje = ctx.wordTime('hoje') ?? D * 0.6;
    T = { D, tMil, tAreia, tHoje, tExplode: Math.max(0.9, tMil - 0.2) };

    // posição do die do SoC já explodido (alvo do macro)
    const soc = C.byName.soc;
    socDie = soc.exploded.clone().add(V(0, 0.05, 0));
    const E = T.tExplode;
    camPos = track([
      { t: 0, v: V(5.3, 2.6, 6.6) },
      { t: E, v: V(4.4, 2.2, 5.6) },
      { t: E + 1.0, v: V(2.6, 2.4, 3.9) },
      { t: tAreia - 0.9, v: V(0.75, 1.45, 1.35) },
      { t: tAreia, v: socDie.clone().add(V(0.36, 0.42, 0.62)) },
      { t: tHoje + 0.5, v: socDie.clone().add(V(0.26, 0.32, 0.48)) },
      { t: D - 0.9, v: V(-4.6, 3.6, 7.6) },
      { t: D, v: V(-4.9, 3.7, 7.9) },
    ]);
    camTgt = track([
      { t: 0, v: V(0, 0.3, 0) },
      { t: E, v: V(0, 0.4, 0) },
      { t: E + 1.0, v: V(0, 1.5, 0) },
      { t: tAreia - 0.9, v: socDie.clone().add(V(0, 0.1, 0)) },
      { t: tAreia, v: socDie },
      { t: tHoje + 0.5, v: socDie },
      { t: D - 0.9, v: V(0, 1.85, 0) },
      { t: D, v: V(0, 1.85, 0) },
    ]);
  },

  update(t, ctx) {
    const { D, tExplode, tAreia, tHoje } = T;
    // console gira devagar; após a explosão continua girando mais lento
    const spin = -0.55 + 0.32 * Math.min(t, tExplode) + 0.08 * Math.max(0, t - tExplode);
    C.root.rotation.y = spin;
    sand.rotation.y = spin;
    // explosão em cascata: peças internas saem primeiro, carcaça por último
    apply_explode(C, p => {
      const delay = p.instanced ? p.seed * 0.35 : Math.max(0, 0.25 - Math.abs(p.layer) * 0.05) + p.seed * 0.1;
      return easeOutExpo(range(t, tExplode + delay, tExplode + delay + 1.4));
    }, t);
    C.fan.userData.rotor.rotation.y = t * 9;

    // areia: redemoinho em volta do die durante o "...areia"
    const sk = smooth(range(t, tAreia - 0.9, tAreia - 0.3)) * (1 - smooth(range(t, tHoje + 0.4, tHoje + 1.2)));
    const im = sand.userData.instanced[0];
    im.material.opacity = sk; im.visible = sk > 0.01;
    if (im.visible) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      const local = socDie.clone().applyAxisAngle(V(0, 1, 0), 0); // die em coordenadas do console
      im.userData.homes.forEach((h, i) => {
        const a = t * (0.6 + h.seed) + h.seed * 10;
        const p = h.pos.clone().applyAxisAngle(V(0, 1, 0), a).add(local);
        p.y += Math.sin(t * 2 + h.seed * 30) * 0.03;
        s.setScalar(h.scale * sk);
        q.setFromEuler(new THREE.Euler(a, a * 1.3, 0));
        m.compose(p, q, s); im.setMatrixAt(i, m);
      });
      im.instanceMatrix.needsUpdate = true;
    }

    // câmera (posições em coordenadas do mundo, mas o die gira junto com o console)
    const rot = new THREE.Matrix4().makeRotationY(spin);
    const macroK = smooth(range(t, tAreia - 1.2, tAreia - 0.2)) * (1 - smooth(range(t, tHoje + 0.5, tHoje + 1.5)));
    const pos = camPos(t), tgt = camTgt(t);
    // no trecho do macro, a câmera acompanha a rotação do console
    const posR = pos.clone().applyMatrix4(rot), tgtR = tgt.clone().applyMatrix4(rot);
    pos.lerp(posR, macroK); tgt.lerp(tgtR, macroK);

    const labels = [];
    const lk = smooth(range(t, T.tMil + 0.35, T.tMil + 0.75)) * (1 - smooth(range(t, tAreia - 1.1, tAreia - 0.7)));
    if (lk > 0) labels.push({ text: '+1.000 peças', anchor: V(0.9, 1.9, 0.5).applyMatrix4(rot), opacity: lk,
                              size: 74, side: -1, dx: 150, dy: -260 });
    const sk2 = smooth(range(t, tAreia - 0.1, tAreia + 0.3)) * (1 - smooth(range(t, tHoje + 0.3, tHoje + 0.7)));
    if (sk2 > 0) labels.push({ text: 'Silício (vem da areia)', anchor: socDie.clone().applyMatrix4(rot), opacity: sk2,
                               size: 44, side: -1, dx: 120, dy: -230 });

    const dist = pos.distanceTo(tgt);
    return {
      camera: { pos, target: tgt, fov: 50 - 12 * macroK },
      dof: macroK > 0.05 ? { focus: dist, aperture: 0.012 * macroK, maxblur: 0.014 } : null,
      labels,
    };
  },

  events() {
    return [{ t: T.tExplode, type: 'whoosh' }, { t: T.tExplode + 0.05, type: 'boom' }];
  },
};
