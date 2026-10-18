import { expect, test } from '@playwright/test'

test.describe('LED Wall Designer', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
    })
  })

  test('open app, canvas renders walls, save, reload, export json', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByText('LED Wall Designer')).toBeVisible()
    await expect(page.getByRole('button', { name: /Jinyuan 4/ })).toBeVisible()

    await page.waitForSelector('[data-testid="canvas-container"] canvas', { timeout: 15_000 })
    const nonEmptyPixels = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas-container"] canvas') as HTMLCanvasElement | null
      if (!canvas || canvas.width < 10) return 0
      const ctx = canvas.getContext('2d')
      if (!ctx) return 0
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let bright = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i]! + data[i + 1]! + data[i + 2]! > 40) bright++
      }
      return bright
    })
    expect(nonEmptyPixels).toBeGreaterThan(200)

    await page.getByRole('button', { name: /Jinyuan 4/ }).click()
    await expect(page.getByText('Wand-Eigenschaften')).toBeVisible()

    await page.getByRole('button', { name: 'Speichern' }).click()
    const saved = await page.evaluate(() =>
      localStorage.getItem('led-wall-designer:project')
    )
    expect(saved).toBeTruthy()

    await page.reload()
    expect(
      await page.evaluate(() => localStorage.getItem('led-wall-designer:project'))
    ).toEqual(saved)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/i)

    await page.getByRole('button', { name: 'Optimizer' }).click()
    await expect(page.getByText('Auflösungs-Optimizer')).toBeVisible()
  })
})
