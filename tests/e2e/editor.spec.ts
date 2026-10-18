import { expect, test } from '@playwright/test'

test.describe('LED Wall Designer', () => {
  test('open app, create rectangular wall, save, reload, export json', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('LED Wall Designer')).toBeVisible()

    await page.getByRole('button', { name: 'Neue Wand' }).click()
    await page.getByRole('button', { name: 'Raster anwenden' }).click()
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

    await page.getByRole('button', { name: 'Editor' }).click()
    await page.getByRole('button', { name: 'Neue Wand' }).click()
  })
})
