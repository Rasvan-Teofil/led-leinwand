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
await page.getByTestId('canvas-fit-all').click()
await page.getByRole('button', { name: /Jinyuan 4/ }).click()
await page.evaluate(() => {
  const api = window.__ledDesignerTest
  if (!api) return
  const wall = api.project.walls.find(w => w.name.includes('Jinyuan'))
  if (!wall) return
  api.editor.selectWall(wall.id)
  api.project.updateWall(wall.id, { testPatternEnabled: true, testPatternKind: 'smpte' })
})
await page.waitForTimeout(1200)
await page.screenshot({ path: path.join(outDir, 'editor-jinyuan-testpattern.png'), fullPage: true })

const canvas = page.locator('[data-testid="canvas-container"] canvas').first()
const box = await canvas.boundingBox()
if (box) {
  await page.mouse.click(box.x + box.width * 0.32, box.y + box.height * 0.58, { button: 'right' })
  await page.waitForSelector('[data-testid="canvas-context-menu"]')
  await page.screenshot({ path: path.join(outDir, 'editor-context-menu.png'), fullPage: true })
  await page.keyboard.press('Escape')
}

const dragPoint = await page.evaluate(() => {
  const api = window.__ledDesignerTest
  if (!api) return null
  const wall = api.project.walls.find(w => w.panels.length > 10)
  const panel = wall?.panels[0]
  if (!wall || !panel) return null
  api.editor.selectPanel(wall.id, panel.id)
  return api.getPanelClientCenter(wall.id, panel.id)
})
const zoomBefore = await page.getByTestId('zoom-indicator').textContent()
if (dragPoint) {
  await page.mouse.move(dragPoint.x, dragPoint.y)
  await page.mouse.down()
  await page.mouse.move(dragPoint.x + 90, dragPoint.y + 35, { steps: 10 })
  await page.mouse.up()
}
await page.waitForTimeout(400)
const zoomAfter = await page.getByTestId('zoom-indicator').textContent()
if (zoomBefore !== zoomAfter) {
  throw new Error(`Zoom changed after drag: ${zoomBefore} -> ${zoomAfter}`)
}
await page.screenshot({ path: path.join(outDir, 'editor-after-panel-drag.png'), fullPage: true })

const snapDrag = await page.evaluate(() => {
  const api = window.__ledDesignerTest
  if (!api) return null
  const wall = api.project.walls.find(w => w.panels.length > 10)
  const panel = wall?.panels[1]
  if (!wall || !panel) return null
  api.project.movePanel(wall.id, panel.id, 520, 0)
  api.editor.setZoom(0.11)
  api.editor.setPan(120, 100)
  api.editor.selectPanel(wall.id, panel.id)
  return api.getPanelClientCenter(wall.id, panel.id)
})
if (snapDrag) {
  await page.mouse.move(snapDrag.x, snapDrag.y)
  await page.mouse.down()
  await page.mouse.move(snapDrag.x - 35, snapDrag.y, { steps: 6 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, 'editor-magnetic-snap-guides.png'), fullPage: true })
  await page.mouse.up()
}

await page.getByRole('button', { name: 'Optimizer' }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(outDir, 'optimizer.png'), fullPage: true })

await page.getByRole('button', { name: 'Preview' }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(outDir, 'preview-testpattern.png'), fullPage: true })

await browser.close()
console.log('Screenshots saved to', outDir)
