import { expect, test } from '@playwright/test'

test.describe('Panel drag preserves editor state', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
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
