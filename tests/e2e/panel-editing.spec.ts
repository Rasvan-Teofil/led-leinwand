import { expect, test } from '@playwright/test'

test.describe('Panel editing (real mouse)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  async function readyCanvas(page: import('@playwright/test').Page) {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('canvas-fit-all').click()
    await page.waitForSelector('[data-testid="canvas-container"] canvas')
  }

  test('add panel from library via drag', async ({ page }) => {
    await readyCanvas(page)
    await page.getByRole('button', { name: /Angebot 2/ }).click()
    const before = await page.evaluate(() => {
      const w = window.__ledDesignerTest!.project.walls.find(wall =>
        wall.name.includes('Angebot 2')
      )!
      return { wallId: w.id, count: w.panels.length }
    })

    const lib = page.getByTestId('library-panel-jinyuan-p391-500x500')
    await lib.scrollIntoViewIfNeeded()
    const libBox = await lib.boundingBox()
    const dropPoint = await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      const wall = api.project.walls.find(w => w.name.includes('Angebot 2'))!
      const canvasEl = document.querySelector('[data-testid="canvas-container"] canvas')!
      const bounds = canvasEl.getBoundingClientRect()
      const z = api.editor.zoom
      const dropLocalX = 1500
      const dropLocalY = 1500
      const dropX = bounds.left + api.editor.panX + (wall.xMm + dropLocalX) * z
      const dropY = bounds.top + api.editor.panY + (wall.yMm + dropLocalY) * z
      return { dropX, dropY }
    })
    if (!libBox) throw new Error('library box')
    const startX = libBox.x + libBox.width / 2
    const startY = libBox.y + libBox.height / 2
    const dropX = dropPoint.dropX
    const dropY = dropPoint.dropY
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(dropX, dropY, { steps: 24 })
    await page.mouse.up()

    await expect.poll(() => page.evaluate((wallId) => {
      const w = window.__ledDesignerTest!.project.walls.find(wall => wall.id === wallId)!
      return w.panels.length
    }, before.wallId)).toBe(before.count + 1)
  })

  test('add panel via Zur Wand hinzufügen button', async ({ page }) => {
    await readyCanvas(page)
    await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      api.editor.selectWall(api.project.walls[0]!.id)
    })
    const before = await page.evaluate(() => {
      const w = window.__ledDesignerTest!.project.walls[0]!
      return w.panels.length
    })

    await page.getByTestId('library-panel-jinyuan-p391-500x500').click()
    await page.getByTestId('library-add-to-wall').click()
    await page.waitForTimeout(300)

    const after = await page.evaluate(() => {
      return window.__ledDesignerTest!.project.walls[0]!.panels.length
    })
    expect(after).toBe(before + 1)
  })

  test('move panel with zoom not at 100%', async ({ page }) => {
    await readyCanvas(page)
    const dragTarget = await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      const wall = api.project.walls.find(w => w.panels.length > 10)!
      const panel = wall.panels[0]!
      api.editor.setZoom(0.14)
      api.editor.setPan(100, 90)
      api.editor.selectPanel(wall.id, panel.id)
      const center = api.getPanelClientCenter(wall.id, panel.id)
      if (!center) throw new Error('center')
      return {
        panelId: panel.id,
        xMm: panel.xMm,
        yMm: panel.yMm,
        centerX: center.x,
        centerY: center.y
      }
    })

    const mmPerPx = 1 / 0.14
    await page.mouse.move(dragTarget.centerX, dragTarget.centerY)
    await page.mouse.down()
    await page.mouse.move(dragTarget.centerX + 400 * mmPerPx, dragTarget.centerY, {
      steps: 12
    })
    await page.mouse.up()
    await page.waitForTimeout(350)

    const after = await page.evaluate((panelId) => {
      const api = window.__ledDesignerTest!
      const panel = api.project.walls.flatMap(w => w.panels).find(p => p.id === panelId)!
      return { xMm: panel.xMm, yMm: panel.yMm, zoom: api.editor.zoom }
    }, dragTarget.panelId)

    expect(after.zoom).toBeCloseTo(0.14, 4)
    expect(after.xMm !== dragTarget.xMm || after.yMm !== dragTarget.yMm).toBeTruthy()
  })

  test('move panel after wall was moved', async ({ page }) => {
    await readyCanvas(page)
    const ctx = await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      const wall = api.project.walls.find(w => w.name.includes('Angebot 2'))!
      const panel = wall.panels[0]!
      api.editor.selectWall(wall.id)
      const handle = api.getWallDragHandleClientPoint(wall.id)
      if (!handle) throw new Error('handle')
      return {
        wallId: wall.id,
        panelId: panel.id,
        panelX: panel.xMm,
        handle
      }
    })

    await page.mouse.move(ctx.handle.x, ctx.handle.y)
    await page.mouse.down()
    await page.mouse.move(ctx.handle.x + 80, ctx.handle.y + 40, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const panelCenter = await page.evaluate(
      ({ wallId, panelId }) => {
        return window.__ledDesignerTest!.getPanelClientCenter(wallId, panelId)
      },
      { wallId: ctx.wallId, panelId: ctx.panelId }
    )
    if (!panelCenter) throw new Error('panel center')

    const mmPerPx = await page.evaluate(() => 1 / window.__ledDesignerTest!.editor.zoom)
    await page.mouse.move(panelCenter.x, panelCenter.y)
    await page.mouse.down()
    await page.mouse.move(panelCenter.x + 250 * mmPerPx, panelCenter.y, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(350)

    const after = await page.evaluate(
      ({ wallId, panelId, startX }) => {
        const api = window.__ledDesignerTest!
        const panel = api.project.walls
          .flatMap(w => w.panels)
          .find(p => p.id === panelId)
        if (!panel) return false
        const host = api.project.walls.find(w => w.id === wallId)!
        return panel.xMm !== startX || host.panels.some(p => p.id === panelId && p.xMm !== startX)
      },
      { wallId: ctx.wallId, panelId: ctx.panelId, startX: ctx.panelX }
    )
    expect(after).toBe(true)
  })

  test('undo and redo after moving a panel', async ({ page }) => {
    await readyCanvas(page)
    const dragTarget = await page.evaluate(() => {
      const api = window.__ledDesignerTest!
      const wall = api.project.walls.find(w => w.panels.length > 5)!
      const panel = wall.panels[1]!
      api.editor.selectPanel(wall.id, panel.id)
      const center = api.getPanelClientCenter(wall.id, panel.id)
      if (!center) throw new Error('center')
      return {
        panelId: panel.id,
        x0: panel.xMm,
        centerX: center.x,
        centerY: center.y
      }
    })

    const mmPerPx = await page.evaluate(() => 1 / window.__ledDesignerTest!.editor.zoom)
    await page.mouse.move(dragTarget.centerX, dragTarget.centerY)
    await page.mouse.down()
    await page.mouse.move(dragTarget.centerX + 300 * mmPerPx, dragTarget.centerY, {
      steps: 8
    })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const moved = await page.evaluate((panelId) => {
      const p = window.__ledDesignerTest!.project.walls
        .flatMap(w => w.panels)
        .find(pp => pp.id === panelId)!
      return p.xMm
    }, dragTarget.panelId)
    expect(moved).not.toBe(dragTarget.x0)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const undone = await page.evaluate((panelId) => {
      return window.__ledDesignerTest!.project.walls
        .flatMap(w => w.panels)
        .find(p => p.id === panelId)!.xMm
    }, dragTarget.panelId)
    expect(undone).toBe(dragTarget.x0)

    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const redone = await page.evaluate((panelId) => {
      return window.__ledDesignerTest!.project.walls
        .flatMap(w => w.panels)
        .find(p => p.id === panelId)!.xMm
    }, dragTarget.panelId)
    expect(redone).toBe(moved)
  })
})
