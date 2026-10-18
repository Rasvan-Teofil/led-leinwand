import { wallLocalBoundingBox } from '#shared/calculations/geometry'
import { occupiedSizeMm } from '#shared/types/panel'
import {
  generateWallTestPatternDataUrl,
  panelPatternSamplePoints,
  resolveWallPatternRaster
} from '#shared/test-patterns/generate'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

export interface LedDesignerTestHooks {
  editor: ReturnType<typeof useEditorStore>
  project: ReturnType<typeof useProjectStore>
  getPanelClientCenter: (wallId: string, panelId: string) => { x: number, y: number } | null
  getWallDragHandleClientPoint: (wallId: string) => { x: number, y: number } | null
  assertWallTestPatternCoverage: (wallId: string) => Promise<{
    ok: boolean
    missingPanelIds: string[]
    resolution: { x: number, y: number }
  }>
}

function getWallDragHandleClientPoint(wallId: string) {
  const canvas = document.querySelector('[data-testid="canvas-container"] canvas')
  if (!canvas) return null
  const bounds = canvas.getBoundingClientRect()
  const project = useProjectStore()
  const editor = useEditorStore()
  const wall = project.walls.find(w => w.id === wallId)
  if (!wall) return null
  const bbox = wallLocalBoundingBox(wall, project.defsById)
  if (!bbox) return null
  const z = editor.zoom
  const gx = editor.panX + (wall.xMm + bbox.xMm) * z
  const gy = editor.panY + (wall.yMm + bbox.yMm) * z - 11
  return { x: bounds.left + gx + 40, y: bounds.top + gy }
}

function getPanelClientCenter(wallId: string, panelId: string) {
  const canvas = document.querySelector('[data-testid="canvas-container"] canvas')
  if (!canvas) return null
  const bounds = canvas.getBoundingClientRect()
  const project = useProjectStore()
  const editor = useEditorStore()
  const wall = project.walls.find(w => w.id === wallId)
  const panel = wall?.panels.find(p => p.id === panelId)
  if (!wall || !panel) return null
  const def = project.defsById.get(panel.panelDefinitionId)
  if (!def) return null
  const occ = occupiedSizeMm(def, panel.rotation)
  const z = editor.zoom
  const gx = editor.panX + wall.xMm * z
  const gy = editor.panY + wall.yMm * z
  const cx = gx + panel.xMm * z + (occ.widthMm * z) / 2
  const cy = gy + panel.yMm * z + (occ.heightMm * z) / 2
  return { x: bounds.left + cx, y: bounds.top + cy }
}

async function assertWallTestPatternCoverage(wallId: string) {
  const project = useProjectStore()
  const wall = project.walls.find(w => w.id === wallId)
  if (!wall) {
    return { ok: false, missingPanelIds: ['wall'], resolution: { x: 0, y: 0 } }
  }
  const raster = resolveWallPatternRaster(
    wall,
    project.defsById,
    project.panelDefinitions
  )
  if (!raster) {
    return { ok: false, missingPanelIds: ['raster'], resolution: { x: 0, y: 0 } }
  }
  const url = generateWallTestPatternDataUrl({
    wall,
    defsById: project.defsById,
    panelDefinitions: project.panelDefinitions,
    kind: 'smpte'
  })
  if (!url) {
    return {
      ok: false,
      missingPanelIds: ['dataUrl'],
      resolution: { x: raster.resX, y: raster.resY }
    }
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('img'))
    el.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = raster.resX
  canvas.height = raster.resY
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      ok: false,
      missingPanelIds: ['ctx'],
      resolution: { x: raster.resX, y: raster.resY }
    }
  }
  ctx.drawImage(img, 0, 0, raster.resX, raster.resY)
  const data = ctx.getImageData(0, 0, raster.resX, raster.resY).data
  const points = panelPatternSamplePoints(
    wall,
    project.defsById,
    raster.resX,
    raster.resY,
    raster.useNativePitchMap
  )
  const missingPanelIds: string[] = []
  for (const pt of points) {
    const i = (pt.y * raster.resX + pt.x) * 4
    const a = data[i + 3]!
    if (a < 200) missingPanelIds.push(pt.panelId)
  }
  return {
    ok: missingPanelIds.length === 0,
    missingPanelIds,
    resolution: { x: raster.resX, y: raster.resY }
  }
}

export default defineNuxtPlugin(() => {
  const hooks: LedDesignerTestHooks = {
    editor: useEditorStore(),
    project: useProjectStore(),
    getPanelClientCenter,
    getWallDragHandleClientPoint,
    assertWallTestPatternCoverage
  }
  ;(window as Window & { __ledDesignerTest?: LedDesignerTestHooks }).__ledDesignerTest = hooks
})
