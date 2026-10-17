import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';

const outDir = '/opt/cursor/artifacts/screenshots';
await mkdir(outDir, { recursive: true });

const launchArgs = [
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader-webgl',
];

const browser = await chromium.launch({ args: launchArgs });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('browser:', msg.text());
});
page.on('pageerror', (err) => console.error('pageerror:', err.message));

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ledApp?.walls?.length > 0);

async function saveCanvasShot(filename, setupFn) {
  await page.evaluate((fnBody) => {
    const app = window.__ledApp;
    // eslint-disable-next-line no-eval
    eval(fnBody)(app);
    for (let i = 0; i < 12; i++) {
      app.orbit.update();
      app.renderer.render(app.scene, app.camera);
    }
  }, setupFn);
  const dataUrl = await page.evaluate(() => window.__ledApp.canvas.toDataURL('image/png'));
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  await writeFile(`${outDir}/${filename}`, buf);
}

const overviewSetup = `((app) => {
  const L = app.layout;
  app.camera.position.set(1.5, 4.2, 5.5);
  app.orbit.target.set(L.wallX + 3, 2, 0);
})`;

const closeupSetup = `((app) => {
  const L = app.layout;
  const w = app.getSelectedWall();
  const cy = w.config.mountHeightM + w.config.heightM / 2;
  app.camera.fov = 38;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(-2.2, 2.05, 0.15);
  app.orbit.target.set(L.wallX + 0.2, cy, 0);
})`;

const compareSetup = `((app) => {
  app.setCompareMode(true);
  const L = app.layout;
  app.camera.fov = 55;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(1.5, 4.2, 5.5);
  app.orbit.target.set(L.wallX + 3, 2, 0);
})`;

await saveCanvasShot('01-overview.png', overviewSetup);
await saveCanvasShot('03-pixel-closeup.png', closeupSetup);
await saveCanvasShot('04-pitch-comparison.png', compareSetup);

await browser.close();
console.log('Screenshots saved to', outDir);
