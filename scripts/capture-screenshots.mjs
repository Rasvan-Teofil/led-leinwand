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
  await page.waitForFunction(
    () => window.__ledApp?.walls?.length > 0 && window.__ledApp?.roomGroup?.userData?.chairMesh
  );
  await page.evaluate(setupFn);
  const dataUrl = await page.evaluate(() => {
    const app = window.__ledApp;
    for (let i = 0; i < 18; i++) {
      app.orbit.update();
      app._updateWallFlatBlend();
      app.renderer.render(app.scene, app.camera);
    }
    return app.canvas.toDataURL('image/png');
  });
  await writeFile(`${outDir}/${filename}`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await browser.close();
}

await capture('01-overview.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(1));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  app.camera.fov = 52;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(px + 10.5, 3.2, 5.8);
  app.orbit.target.set(px + 1.5, 2.0, 0);
});

await capture('02-first-row.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(1));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  const v = L.viewpoints.ersteReihe;
  app.camera.fov = 48;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(v.x, 1.65, v.z);
  app.orbit.target.set(px + 0.2, 2.6, 0);
});

await capture('03-pixel-closeup.png', () => {
  const app = window.__ledApp;
  app.walls.forEach((w) => w.setFlatBlend(0));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  const w = app.getSelectedWall();
  const cy = w.config.mountHeightM + w.config.heightM / 2;
  app.camera.fov = 28;
  app.camera.updateProjectionMatrix();
  app.camera.position.set(px + 1.6, 2.0, 0);
  app.orbit.target.set(px + 0.05, cy, 0);
});

await capture('04-pitch-comparison.png', () => {
  const app = window.__ledApp;
  app.setCompareMode(true);
  app.walls.forEach((w) => w.setFlatBlend(1));
  const L = app.layout;
  const px = L.ledPlaneX ?? L.wallX;
  app.camera.position.set(px + 7.5, 2.5, 0.15);
  app.orbit.target.set(px + 0.3, 2.5, 0);
});

console.log('Screenshots saved to', outDir);
