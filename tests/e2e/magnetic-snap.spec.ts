import { expect, test } from '@playwright/test'

test.describe('Magnetic snap on canvas drag', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  test('panel snaps edge-aligned when dragged ~20mm off grid', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('canvas-fit-all').click()
    await page.waitForSelector('[data-testid="canvas-container"] canvas')

    const ctx = await page.evaluate(() => {
      const api = window.__ledDesignerTest
      if (!api) throw new Error('missing hooks')
      const wall = api.project.walls.find(w => w.name.includes('Jinyuan'))
      if (!wall) throw new Error('jinyuan wall missing')
      const panel = wall.panels.find(p => p.xMm === 500 && p.yMm === 0)
      if (!panel) throw new Error('panel missing')
      api.editor.setZoom(0.1)
      api.editor.setPan(100, 80)
      api.editor.selectPanel(wall.id, panel.id)
      const center = api.getPanelClientCenter(wall.id, panel.id)
      if (!center) throw new Error('center missing')
      return {
        wallId: wall.id,
        panelId: panel.id,
        centerX: center.x,
        centerY: center.y,
        originX: panel.xMm,
        originY: panel.yMm
      }
    })

    const mmPerPx = await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      return 1 / api.editor.zoom
    })
    const dragPx = 20 * mmPerPx

    await page.mouse.move(ctx.centerX, ctx.centerY)
    await page.mouse.down()
    await page.mouse.move(ctx.centerX + dragPx, ctx.centerY, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(400)

    const after = await page.evaluate(({ wallId, panelId }) => {
      const api = window.__ledDesignerTest!
      const wall = api.project.walls.find(w => w.id === wallId)!
      const panel = wall.panels.find(p => p.id === panelId)!
      const overlaps = wall.panels.some((a) => {
        if (a.id === panel.id || !a.enabled) return false
        const defA = api.project.defsById.get(a.panelDefinitionId)
        const defP = api.project.defsById.get(panel.panelDefinitionId)
        if (!defA || !defP) return false
        const aw = defA.widthMm
        const ah = defA.heightMm
        const pw = defP.widthMm
        const ph = defP.heightMm
        return (
          panel.xMm < a.xMm + aw
          && panel.xMm + pw > a.xMm
          && panel.yMm < a.yMm + ah
          && panel.yMm + ph > a.yMm
        )
      })
      return { xMm: panel.xMm, yMm: panel.yMm, overlaps }
    }, { wallId: ctx.wallId, panelId: ctx.panelId })

    expect(after.overlaps).toBe(false)
    expect(after.xMm % 500).toBe(0)
    expect(after.yMm % 500).toBe(0)
  })

  test('invalid drop reverts to origin without overlap', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('canvas-fit-all').click()
    await page.waitForSelector('[data-testid="canvas-container"] canvas')

    const drag = await page.evaluate(() => {
      const api = window.__ledDesignerTest
      if (!api) throw new Error('missing hooks')
      const jinyuan = api.project.walls.find(w => w.name.includes('Jinyuan'))
      if (!jinyuan) throw new Error('walls missing')
      const panel = jinyuan.panels.find(p => p.xMm === 500 && p.yMm === 0)!
      api.editor.setZoom(0.1)
      api.editor.setPan(100, 80)
      api.editor.selectPanel(jinyuan.id, panel.id)
      const center = api.getPanelClientCenter(jinyuan.id, panel.id)
      if (!center) throw new Error('center')
      return {
        wallId: jinyuan.id,
        panelId: panel.id,
        originX: panel.xMm,
        originY: panel.yMm,
        centerX: center.x,
        centerY: center.y
      }
    })

    const mmPerPx = 1 / 0.1
    await page.mouse.move(drag.centerX, drag.centerY)
    await page.mouse.down()
    await page.mouse.move(drag.centerX + 30 * mmPerPx, drag.centerY, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(400)

    const result = await page.evaluate(({ panelId, originX, originY }) => {
      const api = window.__ledDesignerTest!
      const panel = api.project.walls.flatMap(w => w.panels).find(p => p.id === panelId)!
      const wall = api.project.walls.find(w => w.panels.some(p => p.id === panelId))!
      const def = api.project.defsById.get(panel.panelDefinitionId)!
      const overlaps = api.project.walls.some(w =>
        w.panels.some((a) => {
          if (a.id === panel.id || !a.enabled) return false
          const defA = api.project.defsById.get(a.panelDefinitionId)
          if (!defA) return false
          const ax = w.xMm + a.xMm
          const ay = w.yMm + a.yMm
          const px = wall.xMm + panel.xMm
          const py = wall.yMm + panel.yMm
          return (
            px < ax + defA.widthMm
            && px + def.widthMm > ax
            && py < ay + defA.heightMm
            && py + def.heightMm > ay
          )
        })
      )
      return { overlaps, xMm: panel.xMm, yMm: panel.yMm, originX, originY }
    }, {
      panelId: drag.panelId,
      originX: drag.originX,
      originY: drag.originY
    })

    expect(result.overlaps).toBe(false)
    expect(result.xMm).toBe(result.originX)
    expect(result.yMm).toBe(result.originY)
  })
})
