import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const outDir = '/opt/cursor/artifacts/screenshots';
await mkdir(outDir, { recursive: true });

const launchArgs = [
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader-webgl',
];

async function renderFrames(page, n = 20) {
  await page.evaluate((frames) => {
    const app = window.__ledApp;
    for (let i = 0; i < frames; i++) {
      app.orbit.update();
      app._updateWallFlatBlend();
      app.renderer.render(app.scene, app.camera);
    }
  }, n);
}

async function captureFullPage(page, filename, setupFn) {
  await page.evaluate(setupFn);
  await renderFrames(page);
  await page.screenshot({
    path: `${outDir}/${filename}`,
    fullPage: false,
  });
}

const browser = await chromium.launch({ args: launchArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (err) => console.error(err.message));
await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.waitForFunction(
  () => window.__ledApp?.walls?.length > 0 && window.__ledApp?.roomGroup?.userData?.chairMesh
);

await captureFullPage(page, '01-overview.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(1));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  app.camera.fov = 50;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(px + 11, 3.4, 6.2);
  app.orbit.target.set(px + 1.2, 1.85, 0);
});

await captureFullPage(page, '02-first-row.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(0.65));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  const v = L.viewpoints.ersteReihe;
  const w = app.getSelectedWall();
  const cy = w.config.mountHeightM + w.config.heightM / 2;
  app.camera.fov = 56;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(v.x, 1.58, 3.2);
  app.orbit.target.set(px + 0.4, cy + 0.15, 0);
});

await captureFullPage(page, '03-pixel-closeup.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(0));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  const w = app.getSelectedWall();
  const cy = w.config.mountHeightM + w.config.heightM / 2;
  app.camera.fov = 30;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(px + 1.55, 2.05, 0.35);
  app.orbit.target.set(px + 0.06, cy, 0);
});

await browser.close();
console.log('Full-page screenshots saved to', outDir);
