// Motor de render quadro a quadro: estúdio infinito, iluminação de 3 pontos + rim ciano,
// chão reflexivo, profundidade de campo e etiquetas. Totalmente determinístico:
// window.renderAt(t) desenha exatamente o instante t (em segundos) da cena.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const CYAN = 0x2ec4ff;

// Estúdio infinito: esfera com degradê vertical cuja cor no horizonte é igual à do chão/névoa,
// para não haver linha de horizonte (tudo passa pelo mesmo tone mapping).
const HORIZON = new THREE.Color('#1e2021'), TOP = new THREE.Color('#393e45');
function studioDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: TOP }, hor: { value: HORIZON } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 hor; varying vec3 vDir;
      void main(){ float k = smoothstep(0.0, 0.75, vDir.y); gl_FragColor = vec4(mix(hor, top, k), 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), mat);
  m.renderOrder = -1;
  return m;
}

function floorAlpha() {
  // alpha (canal verde): 0.78 no centro -> 1 nas bordas
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const rad = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  rad.addColorStop(0, 'rgb(200,200,200)'); rad.addColorStop(0.15, 'rgb(232,232,232)');
  rad.addColorStop(0.45, 'rgb(255,255,255)'); rad.addColorStop(1, 'rgb(255,255,255)');
  g.fillStyle = rad; g.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
}

export async function createEngine({ width, height, sceneModule, sceneInfo }) {
  const stage = document.getElementById('stage');
  stage.style.width = width + 'px'; stage.style.height = height + 'px';
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = HORIZON.clone();
  scene.fog = new THREE.Fog(HORIZON.clone(), 9, 22);
  const dome = studioDome(); scene.add(dome);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.03, 60);
  scene.add(camera);

  // ---- chão: reflexo + véu escuro com degradê radial + sombras ----
  const mirror = new Reflector(new THREE.CircleGeometry(30, 64), {
    textureWidth: width / 2, textureHeight: height / 2, color: 0x6a6f78, clipBias: 0.003 });
  mirror.rotation.x = -Math.PI / 2; scene.add(mirror);
  const veil = new THREE.Mesh(new THREE.CircleGeometry(30, 64),
    new THREE.MeshBasicMaterial({ color: HORIZON, alphaMap: floorAlpha(), transparent: true, depthWrite: false }));
  veil.rotation.x = -Math.PI / 2; veil.position.y = 0.002; veil.scale.setScalar(1); scene.add(veil);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.55 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = 0.004; shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  // ---- iluminação de 3 pontos + rim ciano (presas à câmera: sempre "de estúdio") ----
  const rig = new THREE.Group(); scene.add(rig);
  const key = new THREE.DirectionalLight(0xfff4e8, 2.6);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 });
  const fill = new THREE.DirectionalLight(0xc8d6ff, 0.7);
  const back = new THREE.DirectionalLight(0xffffff, 1.2);
  const rim = new THREE.DirectionalLight(CYAN, 5.5);
  const rim2 = new THREE.DirectionalLight(CYAN, 2.5);
  const amb = new THREE.HemisphereLight(0x9fb4d0, 0x0c0d10, 0.35);
  scene.add(key, fill, back, rim, rim2, amb, key.target, fill.target, back.target, rim.target, rim2.target);

  function placeLights(target) {
    // direções relativas à câmera
    const fwd = new THREE.Vector3().subVectors(target, camera.position).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const at = (f, r, u, d) => target.clone().addScaledVector(fwd, f * d).addScaledVector(right, r * d).add(new THREE.Vector3(0, u * d, 0));
    key.position.copy(at(-0.7, -0.7, 1.1, 7)); key.target.position.copy(target);
    fill.position.copy(at(-0.8, 0.9, 0.4, 7)); fill.target.position.copy(target);
    back.position.copy(at(1, 0.2, 1.4, 7)); back.target.position.copy(target);
    rim.position.copy(at(1, -0.9, 0.5, 7)); rim.target.position.copy(target);
    rim2.position.copy(at(1, 0.9, 0.3, 7)); rim2.target.position.copy(target);
  }

  // ---- pós-processamento ----
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0, maxblur: 0.01 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());

  // ---- etiquetas (SVG por cima do canvas) ----
  const svg = document.getElementById('overlay');
  svg.setAttribute('width', width); svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const S = width / 1080; // escala de UI
  function drawLabels(labels) {
    let html = '';
    for (const L of labels) {
      if (!L || L.opacity <= 0.001) continue;
      const p = L.anchor.clone().project(camera);
      if (p.z > 1) continue;
      const ax = (p.x * 0.5 + 0.5) * width, ay = (-p.y * 0.5 + 0.5) * height;
      const size = (L.size || 46) * S;
      const tw = L.text.length * size * 0.54, M = 40 * S, dx = (L.dx ?? 110) * S;
      let side = L.side || (ax > width / 2 ? -1 : 1);
      const fits = s => { const e = ax + s * dx; return s > 0 ? e + 16 * S + tw < width - M : e - 16 * S - tw > M; };
      if (!fits(side) && fits(-side)) side = -side;
      let ex = ax + side * dx;
      ex = side > 0 ? Math.max(M, Math.min(ex, width - M - tw - 16 * S)) : Math.min(width - M, Math.max(ex, M + tw + 16 * S));
      const ey = Math.max(M + size, Math.min(height - M, ay + (L.dy ?? -120) * S));
      const lineK = Math.min(1, L.opacity * 1.6);
      const hx = ex + side * (tw + 28 * S) * lineK;
      const tx = side > 0 ? ex + 16 * S : ex - 16 * S;
      html += `<g opacity="${L.opacity.toFixed(3)}">
        <circle cx="${ax}" cy="${ay}" r="${7 * S}" fill="#fff"/>
        <circle cx="${ax}" cy="${ay}" r="${14 * S}" fill="none" stroke="#2EC4FF" stroke-width="${2 * S}"/>
        <polyline points="${ax},${ay} ${ex},${ey} ${hx},${ey}" fill="none" stroke="#fff" stroke-width="${2.2 * S}"
          stroke-linejoin="round" style="filter: drop-shadow(0 0 ${3 * S}px rgba(0,0,0,.6))"/>
        <text x="${tx}" y="${ey - 14 * S}" font-size="${size}" text-anchor="${side > 0 ? 'start' : 'end'}"
          style="paint-order: stroke; stroke: rgba(0,0,0,.45); stroke-width:${6 * S}px">${L.text}</text>
      </g>`;
    }
    svg.innerHTML = html;
  }

  const ctx = { THREE, scene, camera, renderer, width, height, info: sceneInfo, CYAN,
                words: sceneInfo.words || [], duration: sceneInfo.duration,
                // instante (s) em que a palavra é falada na narração
                wordTime(w, nth = 0) {
                  const hits = this.words.filter(x => x.w.toLowerCase().replace(/[^\p{L}\d]/gu, '') === w.toLowerCase());
                  return hits[nth] ? hits[nth].t : null;
                } };
  await sceneModule.setup(ctx);

  function renderAt(t) {
    const st = sceneModule.update(t, ctx);
    camera.position.copy(st.camera.pos);
    camera.fov = st.camera.fov || 50; camera.updateProjectionMatrix();
    camera.lookAt(st.camera.target);
    placeLights(st.camera.target);
    dome.position.copy(camera.position).setY(0);
    const dof = st.dof;
    bokeh.enabled = !!(dof && dof.aperture > 0);
    if (bokeh.enabled) {
      bokeh.uniforms.focus.value = dof.focus;
      bokeh.uniforms.aperture.value = dof.aperture;
      bokeh.uniforms.maxblur.value = dof.maxblur ?? 0.012;
    }
    composer.render();
    drawLabels(st.labels || []);
    return true;
  }
  return { renderAt, ctx };
}

// Ponto de entrada: ?scene=1&w=540&h=960
const qs = new URLSearchParams(location.search);
const id = qs.get('scene') || '1';
const tag = 'cena_' + String(id).padStart(2, '0');
const timeline = await (await fetch('/build/timeline.json')).json();
const info = timeline.scenes.find(s => s.tag === tag);
const mod = await import(`/scenes/${tag}.js`);
await document.fonts.load('700 40px InterV');
const eng = await createEngine({ width: +qs.get('w') || 1080, height: +qs.get('h') || 1920,
                                 sceneModule: mod.default, sceneInfo: info });
window.renderAt = t => eng.renderAt(t);
window.sceneEvents = () => (mod.default.events ? mod.default.events(eng.ctx) : []);
window.sceneDuration = info.duration;
window.ready = true;
