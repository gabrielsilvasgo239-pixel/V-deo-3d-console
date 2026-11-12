// Materiais realistas compartilhados por todas as peças.
import * as THREE from 'three';

function brushedTexture() {
  // textura procedural de alumínio escovado (riscos horizontais)
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {
    const y = rnd() * 512, v = 100 + rnd() * 70;
    g.strokeStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.35})`;
    g.lineWidth = 0.6 + rnd();
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + (rnd() - 0.5) * 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function pcbTexture() {
  // trilhas de cobre finas sob a máscara de solda verde
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#0f3d24'; g.fillRect(0, 0, 1024, 1024);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.lineCap = 'round';
  for (let i = 0; i < 420; i++) {
    let x = rnd() * 1024, y = rnd() * 1024;
    g.strokeStyle = `rgba(60,140,80,${0.35 + rnd() * 0.3})`;
    g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      const d = 20 + rnd() * 120;
      const dir = Math.floor(rnd() * 4);
      if (dir === 0) x += d; else if (dir === 1) x -= d;
      else if (dir === 2) { x += d * 0.7; y += d * 0.7; } else y += d;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 900; i++) { // vias
    g.fillStyle = 'rgba(190,150,80,.8)';
    g.beginPath(); g.arc(rnd() * 1024, rnd() * 1024, 1.6, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function dieTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#9aa3b8'; g.fillRect(0, 0, 512, 512);
  let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tones = ['#a9a2c9', '#8fb0bf', '#c4b38f', '#9fb6a0', '#b7a6b8', '#8e97b3'];
  // blocos funcionais (núcleos, cache, GPU)
  const blocks = [[16, 16, 230, 230], [262, 16, 234, 150], [262, 182, 234, 64], [16, 262, 480, 234]];
  for (const [x, y, w, h] of blocks) {
    g.fillStyle = tones[Math.floor(rnd() * tones.length)]; g.fillRect(x, y, w, h);
    const cell = 8 + Math.floor(rnd() * 3) * 6;
    for (let yy = y + 4; yy < y + h - cell; yy += cell) for (let xx = x + 4; xx < x + w - cell; xx += cell) {
      g.fillStyle = tones[Math.floor(rnd() * tones.length)]; g.globalAlpha = 0.35 + rnd() * 0.4;
      g.fillRect(xx, yy, cell - 2, cell - 2);
    }
    g.globalAlpha = 1; g.strokeStyle = '#d8dbe6'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let cache;
export function materials() {
  if (cache) return cache;
  const brushed = brushedTexture();
  cache = {
    pcb: new THREE.MeshStandardMaterial({ map: pcbTexture(), roughness: 0.82, metalness: 0.05 }),
    pcbPlain: new THREE.MeshStandardMaterial({ color: 0x0f3d24, roughness: 0.85 }),
    copper: new THREE.MeshPhysicalMaterial({ color: 0xe08a4f, metalness: 1, roughness: 0.22, clearcoat: 0.3 }),
    silicon: new THREE.MeshPhysicalMaterial({
      map: dieTexture(), color: 0xffffff, metalness: 0.85, roughness: 0.1, emissive: 0x1a1f2c,
      iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 520],
    }),
    aluminum: new THREE.MeshPhysicalMaterial({
      color: 0xd2d6dc, metalness: 1, roughness: 0.38, roughnessMap: brushed,
      anisotropy: 0.8, anisotropyRotation: 0,
    }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.25 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.2 }),
    whitePlastic: new THREE.MeshPhysicalMaterial({ color: 0xf1f2f4, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.6 }),
    blackPlastic: new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.6 }),
    glossBlack: new THREE.MeshPhysicalMaterial({ color: 0x0c0d10, roughness: 0.15, clearcoat: 1 }),
    epoxy: new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.42 }),
    substrate: new THREE.MeshStandardMaterial({ color: 0x1f5a3a, roughness: 0.5 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.6 }),
    capBlue: new THREE.MeshStandardMaterial({ color: 0x2b3d6b, roughness: 0.4, metalness: 0.3 }),
    ferrite: new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.5, metalness: 0.4 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 }),
    led: new THREE.MeshBasicMaterial({ color: 0x2ec4ff, toneMapped: false }),
    thermalPad: new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: 0.9 }),
    ribbon: new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.6, side: THREE.DoubleSide }),
    sand: new THREE.MeshStandardMaterial({ color: 0xe0c48e, roughness: 0.9 }),
  };
  return cache;
}
