// Renderiza só alguns instantes (para conferência rápida): node render/stills.js <cena> <w> <h> t1 t2 ...
const { execFileSync } = require('child_process');
const [scene, W, H, ...ts] = process.argv.slice(2);
// usa fps=100 para mapear tempo -> índice de quadro
for (const t of ts) execFileSync('node', [__dirname + '/render.js', scene, W, H, '100', '--from', String(Math.round(+t * 100)),
  '--to', String(Math.round(+t * 100) + 1)], { stdio: 'inherit', env: { ...process.env, OUT_DIR: process.env.OUT_DIR } });
