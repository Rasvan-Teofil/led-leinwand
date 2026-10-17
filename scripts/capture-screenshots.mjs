import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const outDir = '/opt/cursor/artifacts/screenshots';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.screenshot({ path: `${outDir}/01-overview.png` });

await page.click('#view-first');
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/02-close-first-row.png` });

// Zoom in with orbit - move camera closer via distance slider
await page.locator('#view-distance').fill('4');
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/03-pixel-closeup.png` });

await page.locator('#compare-mode').check();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/04-pitch-comparison.png` });

await browser.close();
console.log('Screenshots saved to', outDir);
