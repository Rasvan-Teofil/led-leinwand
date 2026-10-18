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
await page.screenshot({ path: path.join(outDir, 'editor-dark.png'), fullPage: true })
await page.getByRole('button', { name: /Jinyuan 4/ }).click()
await page.locator('[data-testid="gesamtuebersicht-card"]').first().waitFor({ state: 'visible', timeout: 10_000 })
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
  const panel = wall?.panels.find(p => p.xMm === 500 && p.yMm === 0)
  if (!wall || !panel) return null
  api.editor.setZoom(0.1)
  api.editor.setPan(120, 100)
  api.editor.selectPanel(wall.id, panel.id)
  const center = api.getPanelClientCenter(wall.id, panel.id)
  if (!center) return null
  return { ...center, zoom: api.editor.zoom }
})
if (snapDrag) {
  const mmPerPx = 1 / snapDrag.zoom
  await page.mouse.move(snapDrag.x, snapDrag.y)
  await page.mouse.down()
  await page.mouse.move(snapDrag.x + 22 * mmPerPx, snapDrag.y, { steps: 8 })
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

await page.getByRole('button', { name: 'Editor' }).click()
await page.waitForTimeout(300)
const wallDrag = await page.evaluate(() => {
  const api = window.__ledDesignerTest
  if (!api) return null
  const wall = api.project.walls.find(w => w.name.includes('L-Form'))
  if (!wall) return null
  api.editor.setZoom(0.08)
  api.editor.setPan(60, 50)
  api.editor.selectWall(wall.id)
  return { wallId: wall.id, ...api.getWallDragHandleClientPoint(wall.id) }
})
if (wallDrag?.x) {
  await page.mouse.move(wallDrag.x, wallDrag.y)
  await page.mouse.down()
  await page.mouse.move(wallDrag.x + 100, wallDrag.y + 55, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outDir, 'editor-wall-moved.png'), fullPage: true })
}

await page.getByTestId('tool-hand').click()
const canvasBox = await page.locator('[data-testid="canvas-container"] canvas').first().boundingBox()
if (canvasBox) {
  const cx = canvasBox.x + canvasBox.width / 2
  const cy = canvasBox.y + canvasBox.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy + 45, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(outDir, 'editor-hand-tool.png'), fullPage: true })
}

await page.evaluate(() => {
  document.documentElement.classList.remove('dark')
  localStorage.setItem('nuxt-color-mode', 'light')
})
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(outDir, 'editor-light.png'), fullPage: true })

await browser.close()
console.log('Screenshots saved to', outDir)
