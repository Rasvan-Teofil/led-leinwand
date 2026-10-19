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
await page.evaluate(() => window.__ledDesignerTest?.editor.clearSelection())
await page.waitForTimeout(200)
await page.screenshot({ path: path.join(outDir, 'editor-inspector-project.png'), fullPage: true })
await page.getByRole('button', { name: /Jinyuan 4/ }).click()
await page.locator('[data-testid="gesamtuebersicht-card"]').waitFor({ state: 'visible', timeout: 10_000 })
const overviewCount = await page.locator('[data-testid="gesamtuebersicht-card"]').count()
if (overviewCount !== 1) {
  throw new Error(`Expected exactly one Gesamtübersicht card, found ${overviewCount}`)
}
await page.screenshot({ path: path.join(outDir, 'editor-inspector-wall.png'), fullPage: true })
await page.evaluate(() => {
  const api = window.__ledDesignerTest
  if (!api) return
  const wall = api.project.walls.find(w => w.name.includes('Jinyuan'))
  const panel = wall?.panels.find(p => p.xMm === 500 && p.yMm === 0)
  if (!wall || !panel) return
  api.editor.setZoom(0.18)
  api.editor.setPan(200, 140)
  api.editor.selectPanel(wall.id, panel.id)
})
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(outDir, 'editor-selected-panel.png'), fullPage: true })
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
const patternOk = await page.evaluate(async () => {
  const api = window.__ledDesignerTest
  if (!api) return false
  const wall = api.project.walls.find(w => w.name.includes('Jinyuan'))
  if (!wall) return false
  const r = await api.assertWallTestPatternCoverage(wall.id)
  return r.ok
})
if (!patternOk) throw new Error('Jinyuan test pattern does not cover all panels')
await page.evaluate(() => {
  const api = window.__ledDesignerTest
  if (!api) return
  api.editor.setZoom(0.14)
  api.editor.setPan(180, 120)
})
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(outDir, 'editor-jinyuan-testpattern.png'), fullPage: true })

await page.evaluate(() => {
  const api = window.__ledDesignerTest
  if (!api) return
  const wall = api.project.walls.find(w => w.name.includes('Jinyuan'))
  if (!wall) return
  api.project.updateWall(wall.id, { testPatternKind: 'coverage' })
})
await page.waitForTimeout(900)
const coverageOk = await page.evaluate(async () => {
  const api = window.__ledDesignerTest
  if (!api) return false
  const wall = api.project.walls.find(w => w.name.includes('Jinyuan'))
  if (!wall) return false
  const r = await api.assertWallTestPatternCoverage(wall.id)
  return r.ok
})
if (!coverageOk) throw new Error('Coverage test pattern does not cover all panels')
await page.screenshot({ path: path.join(outDir, 'editor-jinyuan-coverage.png'), fullPage: true })
await page.evaluate(() => {
  const api = window.__ledDesignerTest
  if (!api) return
  const wall = api.project.walls.find(w => w.name.includes('Jinyuan'))
  if (!wall) return
  api.project.updateWall(wall.id, { testPatternKind: 'smpte' })
})

await page.getByTestId('canvas-fit-all').click()
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(outDir, 'editor-full-height-canvas.png'), fullPage: true })

const canvas = page.locator('[data-testid="canvas-container"] canvas').first()
const box = await canvas.boundingBox()
if (box) {
  await page.mouse.click(box.x + box.width * 0.32, box.y + box.height * 0.58, { button: 'right' })
  await page.waitForSelector('[data-testid="canvas-context-menu"]', { timeout: 8000 }).catch(() => null)
  if (!(await page.locator('[data-testid="canvas-context-menu"]').isVisible())) {
    console.warn('Skipping context menu screenshot')
  } else {
    await page.screenshot({ path: path.join(outDir, 'editor-context-menu.png'), fullPage: true })
    await page.keyboard.press('Escape')
  }
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
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(outDir, 'editor-panel-snapped.png'), fullPage: true })
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
  const wall = api.project.walls.find(w => w.name.includes('Angebot 2'))
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
