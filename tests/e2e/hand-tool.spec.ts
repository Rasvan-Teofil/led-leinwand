import { expect, test } from '@playwright/test'

test.describe('Hand tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  test('H tool pans without changing selection', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('canvas-fit-all').click()
    await page.getByRole('button', { name: /Jinyuan 4/ }).click()

    const before = await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      return {
        panX: api.editor.panX,
        panY: api.editor.panY,
        wallId: api.editor.primaryWallId
      }
    })

    await page.getByTestId('tool-hand').click()
    const canvas = page.locator('[data-testid="canvas-container"] canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const cx = box!.x + box!.width / 2
    const cy = box!.y + box!.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 90, cy + 50, { steps: 6 })
    await page.mouse.up()

    const after = await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      return {
        panX: api.editor.panX,
        panY: api.editor.panY,
        wallId: api.editor.primaryWallId,
        tool: api.editor.canvasTool
      }
    })

    expect(after.tool).toBe('hand')
    expect(after.wallId).toBe(before.wallId)
    expect(after.panX).not.toBeCloseTo(before.panX, 0)
    expect(after.panY).not.toBeCloseTo(before.panY, 0)
  })
})
