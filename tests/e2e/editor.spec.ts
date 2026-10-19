import { expect, test } from '@playwright/test'

test.describe('LED Wall Designer', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
    })
  })

  test('default offers have identical cabinet layouts and uniform P3.91/P2.6 rasters', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /Angebot 1/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Angebot 2/ })).toBeVisible()
    const offers = await page.evaluate(async () => {
      const api = window.__ledDesignerTest!
      return Promise.all(api.project.walls.map(async wall => ({
        name: wall.name,
        layout: wall.panels.map((panel) => {
          const def = api.project.defsById.get(panel.panelDefinitionId)!
          return {
            x: panel.xMm,
            y: panel.yMm,
            width: def.widthMm,
            height: def.heightMm,
            rotation: panel.rotation
          }
        }),
        nominalPitches: [...new Set(wall.panels.map(panel =>
          api.project.defsById.get(panel.panelDefinitionId)!.nominalPitchMm
        ))],
        pattern: await api.assertWallTestPatternCoverage(wall.id)
      })))
    })
    expect(offers).toHaveLength(2)
    expect(offers[1]!.layout).toEqual(offers[0]!.layout)
    expect(offers[0]!.layout.filter(panel => panel.height === 1000)).toHaveLength(16)
    expect(offers[0]!.layout.filter(panel => panel.height === 500)).toHaveLength(8)
    expect(Math.max(...offers[0]!.layout.map(panel => panel.x + panel.width))).toBe(4000)
    expect(Math.max(...offers[0]!.layout.map(panel => panel.y + panel.height))).toBe(2500)
    expect(offers[0]!.nominalPitches).toEqual([3.91])
    expect(offers[1]!.nominalPitches).toEqual([2.6])
    expect(offers[0]!.pattern).toEqual({ ok: true, missingPanelIds: [], resolution: { x: 1024, y: 640 } })
    expect(offers[1]!.pattern).toEqual({ ok: true, missingPanelIds: [], resolution: { x: 1536, y: 960 } })

    await page.evaluate(() => window.__ledDesignerTest!.project.renameProject('Eigene Planung'))
    await page.getByRole('button', { name: 'Einstellungen', exact: true }).click()
    await page.getByTestId('reset-demo-button').click()
    await expect(page.getByRole('dialog', { name: 'Standardangebote laden?' })).toBeVisible()
    expect(await page.evaluate(() => window.__ledDesignerTest!.project.project.name)).toBe('Eigene Planung')
    await page.getByTestId('reset-demo-confirm').click()
    await expect.poll(() => page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('led-wall-designer:project')!)
      return { name: saved.name, walls: saved.walls.map((wall: { name: string }) => wall.name) }
    })).toEqual({ name: 'LED-Angebotsvergleich', walls: offers.map(offer => offer.name) })
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

    await page.reload({ waitUntil: 'networkidle' })
    const after = await page.evaluate(() =>
      localStorage.getItem('led-wall-designer:project')
    )
    const beforeObj = JSON.parse(saved!)
    const afterObj = JSON.parse(after!)
    expect(afterObj.name).toBe(beforeObj.name)
    expect(afterObj.walls.length).toBe(beforeObj.walls.length)
    expect(afterObj.walls[0]?.panels.length).toBe(beforeObj.walls[0]?.panels.length)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/i)

    await page.getByRole('button', { name: 'Optimizer' }).click()
    await expect(page.getByText('Auflösungs-Optimizer')).toBeVisible()
  })
})
