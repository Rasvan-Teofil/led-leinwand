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

function setPlanViewHidden(page, hidden) {
  return page.evaluate((hide) => {
    const list = window.__ledApp?.roomGroup?.userData?.planViewHidden ?? [];
    for (const obj of list) {
      obj.visible = !hide;
    }
  }, hidden);
}

async function captureFullPage(page, filename, setupFn, { hideCeiling = false } = {}) {
  await page.evaluate(() => {
    const app = window.__ledApp;
    app.camera.up.set(0, 1, 0);
    app.orbit.enabled = true;
  });
  await setPlanViewHidden(page, false);
  await page.evaluate(setupFn);
  if (hideCeiling) await setPlanViewHidden(page, true);
  await page.evaluate(() => {
    const app = window.__ledApp;
    app.orbit.enabled = false;
    app.camera.lookAt(app.orbit.target);
  });
  await renderFrames(page);
  await page.screenshot({ path: `${outDir}/${filename}`, fullPage: false });
  await page.evaluate(() => {
    window.__ledApp.orbit.enabled = true;
  });
  if (hideCeiling) await setPlanViewHidden(page, false);
}

const browser = await chromium.launch({ args: launchArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (err) => console.error(err.message));
await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.waitForFunction(
  () =>
    window.__ledApp?.walls?.length > 0 &&
    window.__ledApp?.roomGroup?.userData?.chairMesh?.count >= 60
);

await captureFullPage(page, '01-overview.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(1));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  const tx = px + 0.45;
  const ty = 2.15;
  const tz = 0;
  app.camera.fov = 52;
  app.camera.updateProjectionMatrix();
  app.scene.fog.far = 65;
  app.camera.position.set(8.5, 1.76, 2.2);
  app.orbit.target.set(L.ledPlaneX + 0.35, 2.05, 0);
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

await captureFullPage(
  page,
  '05-plan-topdown.png',
  () => {
    const app = window.__ledApp;
    app.walls.forEach((w) => w.setFlatBlend(1));
    const L = app.layout;
    app.camera.fov = 42;
    app.camera.updateProjectionMatrix();
    app.camera.up.set(0, 0, -1);
    app.camera.position.set(L.centerX, 38, L.centerZ);
    app.orbit.target.set(L.centerX, 0, L.centerZ);
  },
  { hideCeiling: true }
);

await captureFullPage(page, '06-truss-closeup.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(0.35));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  const w = app.getSelectedWall();
  const lintelY = w.config.mountHeightM + w.config.heightM + 0.48;
  app.camera.fov = 28;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(px + 2.8, lintelY + 0.08, 0.55);
  app.orbit.target.set(px + 0.12, lintelY - 0.08, 0);
  app.camera.lookAt(px + 0.12, lintelY - 0.08, 0);
});

await browser.close();
console.log('Full-page screenshots saved to', outDir);
