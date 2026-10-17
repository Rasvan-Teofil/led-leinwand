import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const outDir = '/opt/cursor/artifacts/screenshots';
await mkdir(outDir, { recursive: true });

const launchArgs = [
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader-webgl',
];

async function renderFrames(page, n = 22) {
  await page.evaluate((frames) => {
    const app = window.__ledApp;
    for (let i = 0; i < frames; i++) {
      app.orbit?.update?.();
      app._updateWallFlatBlend();
      app.renderer.render(app.scene, app.camera);
    }
  }, n);
}

async function captureFullPage(page, filename, setupFn) {
  await page.evaluate(() => {
    const app = window.__ledApp;
    app.camera.up.set(0, 1, 0);
  });
  await page.evaluate(setupFn);
  await renderFrames(page);
  await page.screenshot({ path: `${outDir}/${filename}`, fullPage: false });
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
  app.camera.fov = 48;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(L.maxX - 2.5, 3.5, 5.5);
  app.orbit.target.set(px + 2, 1.9, 0);
});

await captureFullPage(page, '02-first-row.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(0.65));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  const v = L.viewpoints.ersteReihe;
  const w = app.getSelectedWall();
  const cy = w.config.mountHeightM + w.config.heightM / 2;
  app.camera.fov = 54;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(v.x, 1.58, 2.6);
  app.orbit.target.set(px + 0.35, cy + 0.1, 0);
});

await captureFullPage(page, '05-plan-topdown.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(1));
  const L = app.layout;
  app.camera.fov = 38;
  app.camera.updateProjectionMatrix();
  app.camera.up.set(0, 0, -1);
  app.camera.position.set(L.centerX, 36, L.centerZ);
  app.orbit.target.set(L.centerX, 0, L.centerZ);
});

await captureFullPage(page, '06-truss-closeup.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(0.4));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  const w = app.getSelectedWall();
  const lintelY = w.config.mountHeightM + w.config.heightM + 0.45;
  app.camera.fov = 32;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(px + 2.2, lintelY + 0.15, 3.8);
  app.orbit.target.set(px + 0.1, lintelY - 0.05, 0);
});

await browser.close();
console.log('Full-page screenshots saved to', outDir);
