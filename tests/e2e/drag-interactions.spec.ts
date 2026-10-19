import { expect, test, type Page } from '@playwright/test'

async function setupEditor(page: Page) {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="canvas-container"] canvas')
  const ids = await page.evaluate(() => {
    const api = window.__ledDesignerTest!
    api.project.newProject('Drag regression')
    const sourceId = api.project.addWall('Source')
    const targetId = api.project.addWall('Target')
    api.project.updateWall(sourceId, { xMm: 0, yMm: 0 })
    api.project.updateWall(targetId, { xMm: 2000, yMm: 0 })
    const panelId = api.project.addPanel(sourceId, 'jinyuan-p391-500x500', 0, 0)!
    api.project.addPanel(sourceId, 'jinyuan-p391-500x500', 500, 0)
    api.project.addPanel(sourceId, 'jinyuan-p391-500x500', 0, 500)
    api.project.addPanel(targetId, 'jinyuan-p391-500x500', 0, 0)
    api.editor.clearSelection()
    return { sourceId, targetId, panelId }
  })
  // Allow the automatic fit after adding panels to finish before choosing a view.
  await page.evaluate(() => {
    const api = window.__ledDesignerTest!
    api.editor.setZoom(0.2)
    api.editor.setPan(100, 100)
  })
  return ids
}

async function expectRenderedAt(page: Page, panelId: string, x: number, y: number) {
  await expect.poll(async () => {
    const rendered = await page.evaluate(id =>
      window.__ledDesignerTest!.getPanelRenderedClientCenter(id), panelId)
    if (!rendered?.dragging) return Infinity
    return Math.hypot(rendered.x - x, rendered.y - y)
  }).toBeLessThan(13)
}

test('panel follows the pointer back and forth across occupied panels', async ({ page }) => {
  const ids = await setupEditor(page)
  const start = await page.evaluate(({ sourceId, panelId }) =>
    window.__ledDesignerTest!.getPanelClientCenter(sourceId, panelId)!, ids)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (const [dx, dy] of [[100, 0], [-80, 0], [100, 160]] as const) {
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 8 })
    await expectRenderedAt(page, ids.panelId, start.x + dx, start.y + dy)
  }
  await page.mouse.up()
  await expect.poll(() => page.evaluate(({ sourceId, panelId }) => {
    const api = window.__ledDesignerTest!
    const wall = api.project.walls.find(w => w.id === sourceId)!
    const panel = wall.panels.find(p => p.id === panelId)!
    return { x: panel.xMm, y: panel.yMm, wallX: wall.xMm, wallY: wall.yMm }
  }, ids)).toEqual({ x: 500, y: 800, wallX: 0, wallY: 0 })

  // Start the next drag at the actual rendered position and return to the empty slot.
  const rendered = await page.evaluate(id =>
    window.__ledDesignerTest!.getPanelRenderedClientCenter(id)!, ids.panelId)
  await page.mouse.move(rendered.x, rendered.y)
  await page.mouse.down()
  await page.mouse.move(start.x, start.y, { steps: 16 })
  await expectRenderedAt(page, ids.panelId, start.x, start.y)
  await page.mouse.up()
  await expect.poll(() => page.evaluate(({ sourceId, panelId }) => {
    const panel = window.__ledDesignerTest!.project.walls.find(w => w.id === sourceId)!.panels.find(p => p.id === panelId)!
    return { x: panel.xMm, y: panel.yMm }
  }, ids)).toEqual({ x: 0, y: 0 })
})

test('snapping to another wall keeps the drag alive until release and supports undo', async ({ page }) => {
  const ids = await setupEditor(page)
  const start = await page.evaluate(({ sourceId, panelId }) =>
    window.__ledDesignerTest!.getPanelClientCenter(sourceId, panelId)!, ids)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (const dx of [300, -100, 300]) {
    await page.mouse.move(start.x + dx, start.y, { steps: 12 })
    await expectRenderedAt(page, ids.panelId, start.x + dx, start.y)
  }
  await page.mouse.up()
  const placement = () => page.evaluate((panelId) => {
    const api = window.__ledDesignerTest!
    const host = api.project.walls.find(w => w.panels.some(p => p.id === panelId))!
    const panel = host.panels.find(p => p.id === panelId)!
    return { host: host.id, x: panel.xMm, y: panel.yMm, dragging: api.editor.canvasDragging }
  }, ids.panelId)
  await expect.poll(placement).toEqual({ host: ids.targetId, x: -500, y: 0, dragging: false })
  await page.keyboard.press('Control+z')
  await expect.poll(placement).toEqual({ host: ids.sourceId, x: 0, y: 0, dragging: false })
  await page.keyboard.press('Control+Shift+z')
  await expect.poll(placement).toEqual({ host: ids.targetId, x: -500, y: 0, dragging: false })
})

test('only the top tag moves the wall and right-click never starts a wall drag', async ({ page }) => {
  const ids = await setupEditor(page)
  const points = await page.evaluate(({ sourceId }) => {
    const api = window.__ledDesignerTest!
    api.editor.preferences.snapEnabled = false
    const tag = api.getWallDragHandleClientPoint(sourceId)!
    return { tag, frame: { x: tag.x + 110, y: tag.y + 161 } }
  }, ids)
  const wallPosition = () => page.evaluate((id) => {
    const api = window.__ledDesignerTest!
    const wall = api.project.walls.find(w => w.id === id)!
    return { x: wall.xMm, y: wall.yMm, dragging: api.editor.canvasDraggingWall }
  }, ids.sourceId)
  await page.mouse.move(points.frame.x, points.frame.y)
  await page.mouse.down()
  await page.mouse.move(points.frame.x + 60, points.frame.y + 30, { steps: 6 })
  await page.mouse.up()
  await expect.poll(wallPosition).toEqual({ x: 0, y: 0, dragging: false })

  await page.mouse.move(points.tag.x, points.tag.y)
  await page.mouse.down({ button: 'right' })
  await expect.poll(wallPosition).toEqual({ x: 0, y: 0, dragging: false })
  await page.mouse.up({ button: 'right' })
  await page.keyboard.press('Escape')

  await page.mouse.move(points.tag.x, points.tag.y)
  await page.mouse.down()
  await page.mouse.move(points.tag.x + 60, points.tag.y + 40, { steps: 8 })
  await page.mouse.up()
  await expect.poll(wallPosition).toEqual({ x: 300, y: 200, dragging: false })
  await expect.poll(() => page.evaluate((id) => {
    const wall = window.__ledDesignerTest!.project.walls.find(w => w.id === id)!
    return wall.panels.map(p => [p.xMm, p.yMm])
  }, ids.sourceId)).toEqual([[0, 0], [500, 0], [0, 500]])
})

test('a rotated panel still follows the pointer after moving its wall by the tag', async ({ page }) => {
  const ids = await setupEditor(page)
  const tag = await page.evaluate(({ sourceId }) => {
    const api = window.__ledDesignerTest!
    api.editor.preferences.snapEnabled = false
    return api.getWallDragHandleClientPoint(sourceId)!
  }, ids)
  await page.mouse.move(tag.x, tag.y)
  await page.mouse.down()
  await page.mouse.move(tag.x + 60, tag.y + 40, { steps: 8 })
  await page.mouse.up()
  await page.evaluate(({ sourceId, panelId }) => {
    window.__ledDesignerTest!.project.updatePanel(sourceId, panelId, {
      panelDefinitionId: 'jinyuan-p391-500x1000',
      rotation: 90,
      xMm: 0,
      yMm: 1000
    })
  }, ids)
  const start = await page.evaluate(id =>
    window.__ledDesignerTest!.getPanelRenderedClientCenter(id)!, ids.panelId)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (const [dx, dy] of [[40, 60], [-20, 100], [80, 40]] as const) {
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 8 })
    await expectRenderedAt(page, ids.panelId, start.x + dx, start.y + dy)
  }
  await page.mouse.up()
  await expect.poll(() => page.evaluate(({ sourceId, panelId }) => {
    const api = window.__ledDesignerTest!
    const wall = api.project.walls.find(w => w.id === sourceId)!
    const panel = wall.panels.find(p => p.id === panelId)!
    const model = api.getPanelClientCenter(sourceId, panelId)!
    const rendered = api.getPanelRenderedClientCenter(panelId)!
    return {
      wallX: wall.xMm,
      wallY: wall.yMm,
      x: panel.xMm,
      y: panel.yMm,
      rotation: panel.rotation,
      renderError: Math.round(Math.hypot(model.x - rendered.x, model.y - rendered.y))
    }
  }, ids)).toEqual({ wallX: 300, wallY: 200, x: 400, y: 1200, rotation: 90, renderError: 0 })
})
