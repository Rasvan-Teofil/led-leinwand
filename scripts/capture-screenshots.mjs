import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const outDir = '/opt/cursor/artifacts/screenshots'
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.addInitScript(() => localStorage.clear())
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="canvas-container"] canvas', { timeout: 30_000 })
await page.waitForTimeout(1200)

await page.getByText(/Jinyuan/).first().click()
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(outDir, 'editor-two-walls.png'), fullPage: true })

const bright = await page.evaluate(() => {
  const canvas = document.querySelector('[data-testid="canvas-container"] canvas')
  if (!canvas) return 0
  const ctx = canvas.getContext('2d')
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let n = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] + d[i + 1] + d[i + 2] > 40) n++
  }
  return n
})
if (bright < 200) {
  throw new Error(`Canvas appears empty (bright pixels=${bright})`)
}

await page.getByRole('button', { name: 'Optimizer' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(outDir, 'optimizer.png'), fullPage: true })

await page.getByRole('button', { name: 'Preview' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(outDir, 'preview.png'), fullPage: true })

await browser.close()
console.log('Screenshots saved to', outDir)
