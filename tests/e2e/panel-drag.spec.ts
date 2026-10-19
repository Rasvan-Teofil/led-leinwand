import { expect, test } from '@playwright/test'

test.describe('Panel drag preserves editor state', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  for (const selected of [false, true]) {
    test(`dragging a ${selected ? 'selected' : 'unselected'} panel keeps its wall and neighbors fixed`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-testid="canvas-container"] canvas')

      const target = await page.evaluate((selected) => {
        const api = window.__ledDesignerTest!
        const wall = api.project.walls.find(w => w.panels.length > 10)!
        const panel = wall.panels.find(p => p.xMm === 0 && p.yMm === 0)!
        api.project.updateWall(wall.id, { xMm: 1000, yMm: 500 })
        api.editor.setZoom(0.12)
        api.editor.setPan(140, 120)
        api.editor.preferences.snapEnabled = false
        api.editor.clearSelection()
        if (selected) api.editor.selectPanel(wall.id, panel.id)
        return {
          wallId: wall.id,
          panelId: panel.id,
          walls: api.project.walls.map(w => ({ id: w.id, xMm: w.xMm, yMm: w.yMm })),
          neighbors: api.project.walls.flatMap(w => w.panels)
            .filter(p => p.id !== panel.id)
            .map(p => ({ id: p.id, xMm: p.xMm, yMm: p.yMm }))
        }
      }, selected)

      for (let drag = 1; drag <= 2; drag++) {
        const center = await page.evaluate(({ wallId, panelId }) =>
          window.__ledDesignerTest!.getPanelClientCenter(wallId, panelId)!, target)
        await page.mouse.move(center.x, center.y)
        await page.mouse.down()
        await page.mouse.move(center.x - 30, center.y, { steps: 4 })

        // Verify the intermediate state too: a jump must not be hidden by mouseup.
        await expect.poll(() => page.evaluate(() =>
          window.__ledDesignerTest!.project.walls.map(w => ({ id: w.id, xMm: w.xMm, yMm: w.yMm }))
        )).toEqual(target.walls)
        await page.mouse.move(center.x - 60, center.y, { steps: 4 })
        await page.mouse.up()

        await expect.poll(() => page.evaluate(({ wallId, panelId }) => {
          const api = window.__ledDesignerTest!
          const panel = api.project.walls.find(w => w.id === wallId)!.panels.find(p => p.id === panelId)!
          return {
            xMm: panel.xMm,
            yMm: panel.yMm,
            selection: api.editor.primaryPanelId,
            zoom: api.editor.zoom,
            panX: api.editor.panX,
            panY: api.editor.panY,
            dragging: api.editor.canvasDragging,
            draggingWall: api.editor.canvasDraggingWall,
            walls: api.project.walls.map(w => ({ id: w.id, xMm: w.xMm, yMm: w.yMm })),
            neighbors: api.project.walls.flatMap(w => w.panels)
              .filter(p => p.id !== panelId)
              .map(p => ({ id: p.id, xMm: p.xMm, yMm: p.yMm }))
          }
        }, target)).toEqual({
          xMm: -500 * drag,
          yMm: 0,
          selection: target.panelId,
          zoom: 0.12,
          panX: 140,
          panY: 120,
          dragging: false,
          draggingWall: false,
          walls: target.walls,
          neighbors: target.neighbors
        })
      }
    })
  }

  test('an overlapping drop restores the rendered panel to its original position', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="canvas-container"] canvas')
    const target = await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      const wall = api.project.walls.find(w => w.panels.length > 10)!
      const panel = wall.panels.find(p => p.xMm === 0 && p.yMm === 0)!
      api.editor.setZoom(0.2)
      api.editor.setPan(100, 100)
      api.editor.preferences.snapEnabled = false
      api.editor.selectPanel(wall.id, panel.id)
      return { wallId: wall.id, panelId: panel.id }
    })
    const center = await page.evaluate(({ wallId, panelId }) =>
      window.__ledDesignerTest!.getPanelClientCenter(wallId, panelId)!, target)
    await page.mouse.move(center.x, center.y)
    await page.mouse.down()
    // Move onto the neighboring panel, leaving the original center uncovered.
    await page.mouse.move(center.x + 120, center.y, { steps: 8 })
    await page.mouse.up()
    await page.evaluate(() => window.__ledDesignerTest!.editor.clearSelection())
    await page.mouse.click(center.x, center.y)
    await expect.poll(() => page.evaluate(() =>
      window.__ledDesignerTest!.editor.primaryPanelId
    )).toBe(target.panelId)
    await expect.poll(() => page.evaluate(({ wallId, panelId }) => {
      const api = window.__ledDesignerTest!
      const wall = api.project.walls.find(w => w.id === wallId)!
      const panel = wall.panels.find(p => p.id === panelId)!
      return { wallX: wall.xMm, wallY: wall.yMm, x: panel.xMm, y: panel.yMm }
    }, target)).toEqual({ wallX: 0, wallY: 0, x: 0, y: 0 })
  })

  test('zoom, pan, and selection stay stable after dragging a panel', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('canvas-fit-all').click()
    await page.waitForSelector('[data-testid="canvas-container"] canvas')

    const dragTarget = await page.evaluate(() => {
      const api = window.__ledDesignerTest
      if (!api) throw new Error('test hooks missing')
      const wall = api.project.walls.find(w => w.panels.length > 10)
      if (!wall) throw new Error('demo wall missing')
      const panel = wall.panels.find(p => p.xMm === 500 && p.yMm === 0)!
      if (!panel) throw new Error('panel at 500,0 missing')
      api.editor.setZoom(0.12)
      api.editor.setPan(140, 120)
      api.editor.selectPanel(wall.id, panel.id)
      const center = api.getPanelClientCenter(wall.id, panel.id)
      if (!center) throw new Error('panel center not on canvas')
      return {
        wallId: wall.id,
        panelId: panel.id,
        xMm: panel.xMm,
        yMm: panel.yMm,
        centerX: center.x,
        centerY: center.y
      }
    })

    const before = await page.evaluate((panelId) => {
      const api = window.__ledDesignerTest!
      const panel = api.project.walls.flatMap(w => w.panels).find(p => p.id === panelId)!
      return {
        zoom: api.editor.zoom,
        panX: api.editor.panX,
        panY: api.editor.panY,
        panelId: api.editor.primaryPanelId,
        xMm: panel.xMm,
        yMm: panel.yMm
      }
    }, dragTarget.panelId)

    const mmPerPx = 1 / 0.12
    await page.mouse.move(dragTarget.centerX, dragTarget.centerY)
    await page.mouse.down()
    await page.mouse.move(dragTarget.centerX + 500 * mmPerPx, dragTarget.centerY, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const after = await page.evaluate((panelId) => {
      const api = window.__ledDesignerTest!
      const panel = api.project.walls.flatMap(w => w.panels).find(p => p.id === panelId)!
      return {
        zoom: api.editor.zoom,
        panX: api.editor.panX,
        panY: api.editor.panY,
        panelId: api.editor.primaryPanelId,
        xMm: panel.xMm,
        yMm: panel.yMm
      }
    }, dragTarget.panelId)

    expect(after.zoom).toBeCloseTo(before.zoom, 5)
    expect(after.panX).toBeCloseTo(before.panX, 0)
    expect(after.panY).toBeCloseTo(before.panY, 0)
    expect(after.panelId).toBe(before.panelId)
    expect(after.xMm !== before.xMm || after.yMm !== before.yMm).toBeTruthy()
    await expect(page.getByText('Panel-Instanz')).toBeVisible()
  })
})
