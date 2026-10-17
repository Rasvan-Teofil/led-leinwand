import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';

const outDir = '/opt/cursor/artifacts/screenshots';
await mkdir(outDir, { recursive: true });

const launchArgs = [
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader-webgl',
];

async function capture(filename, setupFn) {
  const browser = await chromium.launch({ args: launchArgs });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', (err) => console.error(err.message));
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ledApp?.walls?.length > 0);
  await page.evaluate(setupFn);
  const dataUrl = await page.evaluate(() => {
    const app = window.__ledApp;
    for (let i = 0; i < 15; i++) {
      app.orbit.update();
      app.renderer.render(app.scene, app.camera);
    }
    return app.canvas.toDataURL('image/png');
  });
  await writeFile(`${outDir}/${filename}`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await browser.close();
}

await capture('01-overview.png', () => {
  const app = window.__ledApp;
  const L = app.layout;
  app.camera.position.set(2.2, 4.5, 4.2);
  app.orbit.target.set(L.wallX + 2.5, 1.6, 0);
});

await capture('03-pixel-closeup.png', () => {
  const app = window.__ledApp;
  const L = app.layout;
  const w = app.getSelectedWall();
  const cy = w.config.mountHeightM + w.config.heightM / 2;
  app.camera.fov = 28;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(L.wallX + 1.6, 2.0, 0);
  app.orbit.target.set(L.wallX + 0.05, cy, 0);
});

await capture('04-pitch-comparison.png', () => {
  const app = window.__ledApp;
  app.setCompareMode(true);
  const L = app.layout;
  app.camera.position.set(L.wallX + 7.2, 2.4, 0);
  app.orbit.target.set(L.wallX + 0.2, 2.45, 0);
});

console.log('Screenshots saved to', outDir);
