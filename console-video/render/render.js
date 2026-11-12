// Captura quadro a quadro de uma cena com Playwright (Chromium headless).
// uso: node render/render.js <cena> <largura> <altura> <fps> [--from N --to M]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FONTS = process.env.FONT_DIR || '/usr/share/fonts/opentype/inter';
const [scene = '1', W = '1080', H = '1920', FPS = '30'] = process.argv.slice(2);
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : null; };
const tag = 'cena_' + String(scene).padStart(2, '0');
const outDir = process.env.OUT_DIR || path.join(ROOT, 'frames', `${tag}_${W}x${H}`);

const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.otf': 'font/otf' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const file = u.startsWith('/fonts/') ? path.join(FONTS, u.slice(7)) : path.join(ROOT, u);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
                                                 '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(`http://localhost:${port}/render/index.html?scene=${scene}&w=${W}&h=${H}`);
  await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
  const dur = await page.evaluate('window.sceneDuration');
  const events = await page.evaluate('window.sceneEvents()');
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'build', `events_${tag}.json`), JSON.stringify(events));
  const total = Math.round(dur * +FPS);
  const from = arg('--from') ?? 0, to = arg('--to') ?? total;
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await page.evaluate(t => window.renderAt(t), f / +FPS);
    await page.screenshot({ path: path.join(outDir, `${String(f).padStart(5, '0')}.png`) });
    if (f % 10 === 0 || f === to - 1) {
      const el = (Date.now() - t0) / 1000, per = el / (f - from + 1);
      process.stdout.write(`\r${tag} quadro ${f + 1}/${total}  ${per.toFixed(2)}s/quadro  restante ~${Math.round(per * (to - f - 1))}s   `);
    }
  }
  console.log(`\n${tag}: ${to - from} quadros em ${outDir}`);
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
