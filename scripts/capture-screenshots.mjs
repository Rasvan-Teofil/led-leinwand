import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const outDir = '/opt/cursor/artifacts/screenshots'
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: path.join(outDir, 'editor-two-walls.png'), fullPage: true })

await page.getByRole('button', { name: 'Optimizer' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(outDir, 'optimizer.png'), fullPage: true })

await page.getByRole('button', { name: 'Preview' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(outDir, 'preview.png'), fullPage: true })

await browser.close()
console.log('Screenshots saved to', outDir)
