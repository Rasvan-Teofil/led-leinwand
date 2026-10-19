import { expect, test } from '@playwright/test'

test.describe('Wall drag', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  test('moves wall via drag handle with history step', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('canvas-fit-all').click()
    await page.waitForSelector('[data-testid="canvas-container"] canvas')

    const ctx = await page.evaluate(() => {
      const api = window.__ledDesignerTest
      if (!api) throw new Error('hooks')
      const wall = api.project.walls.find(w => w.name.includes('Angebot 2'))
      if (!wall) throw new Error('wall')
      api.editor.setZoom(0.08)
      api.editor.setPan(60, 50)
      api.editor.selectWall(wall.id)
      const pt = api.getWallDragHandleClientPoint(wall.id)
      if (!pt) throw new Error('handle')
      return { wallId: wall.id, xMm: wall.xMm, yMm: wall.yMm, ...pt }
    })

    const zoomBefore = await page.getByTestId('zoom-indicator').textContent()
    await page.mouse.move(ctx.x, ctx.y)
    await page.mouse.down()
    await page.mouse.move(ctx.x + 120, ctx.y + 60, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(400)

    const after = await page.evaluate((wallId) => {
      const api = window.__ledDesignerTest!
      const wall = api.project.walls.find(w => w.id === wallId)!
      return { xMm: wall.xMm, yMm: wall.yMm }
    }, ctx.wallId)

    const zoomAfter = await page.getByTestId('zoom-indicator').textContent()
    expect(zoomAfter).toBe(zoomBefore)
    expect(after.xMm !== ctx.xMm || after.yMm !== ctx.yMm).toBeTruthy()
  })
})
