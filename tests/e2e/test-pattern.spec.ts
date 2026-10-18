import { expect, test } from '@playwright/test'

test.describe('Wall test pattern', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  test('SMPTE pattern covers every active panel including bottom row', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('canvas-fit-all').click()
    await page.getByRole('button', { name: /Jinyuan 4/ }).click()

    const result = await page.evaluate(async () => {
      const api = window.__ledDesignerTest
      if (!api) throw new Error('hooks')
      const wall = api.project.walls.find(w => w.name.includes('Jinyuan'))
      if (!wall) throw new Error('wall')
      api.project.updateWall(wall.id, {
        testPatternEnabled: true,
        testPatternKind: 'smpte'
      })
      await new Promise(r => setTimeout(r, 400))
      return api.assertWallTestPatternCoverage(wall.id)
    })

    expect(result.ok).toBe(true)
    expect(result.missingPanelIds).toEqual([])
    expect(result.resolution).toEqual({ x: 1024, y: 640 })
  })
})
