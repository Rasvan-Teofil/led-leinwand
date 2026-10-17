/**
 * Ganzseitige Screenshots (Sidebar + Kameraleiste) für den PR.
 * Voraussetzung: `python3 server.py` läuft auf Port 8080, Playwright-Chromium installiert.
 * Aufruf: node scripts/capture-screenshots.mjs [Ausgabeordner]
 */
import { chromium } from 'playwright';
import { mkdir, readdir, rm } from 'fs/promises';
import { execFileSync } from 'child_process';

const outDir = process.argv[2] ?? '/opt/cursor/artifacts/screenshots';
const baseUrl = process.env.LED_URL ?? 'http://127.0.0.1:8080/';

await mkdir(outDir, { recursive: true });
for (const f of await readdir(outDir)) {
  if (f.endsWith('.png')) await rm(`${outDir}/${f}`);
}

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (err) => console.error('pageerror:', err.message));
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ledApp?.roomGroup?.userData?.chairCount === 64, null, {
  timeout: 60000,
});

async function settle() {
  await page.evaluate(() => {
    for (let i = 0; i < 6; i++) window.__ledApp.renderFrame();
  });
}

async function shoot(name) {
  await settle();
  await page.screenshot({ path: `${outDir}/${name}`, fullPage: true });
  console.log('saved', name);
}

/** Freie Kamera (Orbit bleibt aktiv, damit die Ansicht danach bedienbar ist). */
async function freeCamera({ pos, target, fov }) {
  await page.evaluate(
    ({ pos, target, fov }) => {
      const app = window.__ledApp;
      app.setPlanView(false);
      app.activePreset = null;
      app.camera.fov = fov;
      app.camera.updateProjectionMatrix();
      app.camera.position.set(...pos);
      app.orbit.target.set(...target);
      app.camera.lookAt(app.orbit.target);
      app.orbit.update();
      document.querySelectorAll('.view-bar button').forEach((b) => b.classList.remove('active'));
    },
    { pos, target, fov }
  );
}

/** Sichtprüfung: LED-Fläche per Raycast, Bühnenkante und Stühle im Bildausschnitt. */
async function visibilityReport() {
  return page.evaluate(() => {
    const app = window.__ledApp;
    const THREE = window.__ledTHREE;
    const cam = app.activeCamera;
    cam.updateMatrixWorld();
    const L = app.layout;
    const wall = app.getSelectedWall();
    const led = wall.group.getObjectByName('led-surface');
    const box = new THREE.Box3().setFromObject(led);
    const inView = (v) => Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z > -1 && v.z < 1;
    const ray = new THREE.Raycaster();
    const targets = [];
    app.scene.traverseVisible((o) => {
      if (o.isMesh) targets.push(o);
    });
    let samples = 0;
    let hits = 0;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const p = new THREE.Vector3(
          box.max.x,
          box.min.y + ((i + 0.5) / 5) * (box.max.y - box.min.y),
          box.min.z + ((j + 0.5) / 5) * (box.max.z - box.min.z)
        );
        const v = p.clone().project(cam);
        if (!inView(v)) continue;
        samples++;
        ray.setFromCamera(new THREE.Vector2(v.x, v.y), cam);
        const first = ray.intersectObjects(targets, false)[0];
        if (first?.object === led) hits++;
      }
    }
    let front = 0;
    let frontTotal = 0;
    for (let z = L.stage.zMin; z <= L.stage.zMax + 1e-6; z += 0.5) {
      frontTotal++;
      if (inView(new THREE.Vector3(L.stage.xMax, L.stage.heightM, z).project(cam))) front++;
    }
    const chairs = app.roomGroup.userData.chairMesh.children[0];
    const m = new THREE.Matrix4();
    let chairsInView = 0;
    for (let i = 0; i < chairs.count; i++) {
      chairs.getMatrixAt(i, m);
      const p = new THREE.Vector3().setFromMatrixPosition(m);
      p.y = 0.45;
      if (inView(p.project(cam))) chairsInView++;
    }
    const pos = cam.position;
    return {
      eye: `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`,
      fov: cam.isPerspectiveCamera ? cam.fov.toFixed(1) : 'ortho',
      ledRaysUnblocked: `${hits}/${samples} of 25`,
      stageFrontInFrame: `${front}/${frontTotal}`,
      chairsInFrame: chairsInView,
    };
  });
}

async function canvasRect() {
  return page.evaluate(() => {
    const r = window.__ledApp.canvas.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
}

const report = {};

// 1) Hinten im Saal stehend, Blick zur Bühne (wie Foto 3).
await freeCamera({ pos: [12.2, 1.65, 1.4], target: [-0.6, 1.9, -0.6], fov: 62 });
report['back of room (standing)'] = await visibilityReport();
await shoot('01-back-of-room.png');

// 2–5) Kamera-Presets über die Buttons.
const presets = [
  ['#view-back', '02-letzte-reihe.png', 'Letzte Reihe'],
  ['#view-first', '03-erste-reihe.png', 'Erste Reihe'],
  ['#view-mid', 'tmp-mitte.png', 'Mitte'],
  ['#view-tech', 'tmp-tech.png', 'Tech-Pult'],
];
for (const [sel, file, label] of presets) {
  await page.click(sel);
  report[label] = await visibilityReport();
  await shoot(file);
}

// 6) Draufsicht (Decke ausgeblendet).
await page.click('#view-plan');
report.Draufsicht = await visibilityReport();
await shoot('04-draufsicht.png');

// 7) Publikum → Bühne wie Foto 2 (stehend, leicht seitlich).
await freeCamera({ pos: [4.4, 1.62, -1.9], target: [-0.6, 2.1, 0.5], fov: 60 });
report['audience like photo 2'] = await visibilityReport();
await shoot('07-publikum-wie-foto2.png');

// 8) Traversen-Nahaufnahmen am LED-Torbogen.
const truss = await page.evaluate(() => {
  const app = window.__ledApp;
  const w = app.getSelectedWall();
  const L = app.layout;
  const top = w.config.mountHeightM + w.config.heightM;
  return { x: L.ledWall.trussX, top, half: w.config.widthM / 2 + 0.25, baseY: L.ledWall.baseY };
});
await freeCamera({
  pos: [truss.x + 2.6, truss.top - 0.3, -truss.half + 2.2],
  target: [truss.x, truss.top + 0.4, -truss.half + 0.3],
  fov: 40,
});
await shoot('05-traverse-nah.png');
await freeCamera({
  pos: [truss.x + 1.25, truss.baseY + 0.75, -truss.half + 0.95],
  target: [truss.x, truss.baseY + 0.35, -truss.half],
  fov: 42,
});
await shoot('06-traverse-fuss.png');

// Raster aller vier Presets (nur die 3D-Ansicht).
const rect = await canvasRect();
await browser.close();
execFileSync('python3', [
  '-c',
  `
import sys
from PIL import Image, ImageDraw
out, x, y, w, h = sys.argv[1], *map(int, sys.argv[2:6])
files = [('tmp-tech.png', 'Tech-Pult'), ('02-letzte-reihe.png', 'Letzte Reihe'), ('tmp-mitte.png', 'Mitte'), ('03-erste-reihe.png', 'Erste Reihe')]
tiles = []
for f, label in files:
    im = Image.open(f'{out}/{f}').convert('RGB').crop((x, y, x + w, y + h)).resize((w // 2, h // 2), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.rectangle((8, 8, 8 + 9 * len(label) + 16, 34), fill=(20, 20, 28))
    d.text((16, 14), label, fill=(240, 240, 240))
    tiles.append(im)
grid = Image.new('RGB', (w, h), (0, 0, 0))
for i, t in enumerate(tiles):
    grid.paste(t, ((i % 2) * (w // 2), (i // 2) * (h // 2)))
grid.save(f'{out}/08-presets-raster.png')
`,
  outDir,
  String(rect.x),
  String(rect.y),
  String(rect.w),
  String(rect.h),
]);
await rm(`${outDir}/tmp-mitte.png`);
await rm(`${outDir}/tmp-tech.png`);
console.log('saved 08-presets-raster.png');
console.table(report);
