import { rectsOverlap } from './geometry'
import { occupiedSizeMm } from '../types/panel'
import type { PanelDefinition, RotationDeg } from '../types/panel'
import type { LEDWall } from '../types/wall'

function panelRectsOnWall(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>,
  excludePanelId?: string
) {
  const rects: Array<{ xMm: number, yMm: number, widthMm: number, heightMm: number }> = []
  for (const p of wall.panels) {
    if (!p.enabled || p.id === excludePanelId) continue
    const def = defsById.get(p.panelDefinitionId)
    if (!def) continue
    const size = occupiedSizeMm(def, p.rotation)
    rects.push({
      xMm: p.xMm,
      yMm: p.yMm,
      widthMm: size.widthMm,
      heightMm: size.heightMm
    })
  }
  return rects
}

function isFreeOnWall(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>,
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number
): boolean {
  const candidate = { xMm, yMm, widthMm, heightMm }
  for (const r of panelRectsOnWall(wall, defsById)) {
    if (rectsOverlap(candidate, r)) return false
  }
  return true
}

/**
 * Next non-overlapping top-left on a wall, preferring positions snapped to existing panels.
 */
export function findNextPanelPlacementOnWall(
  wall: LEDWall,
  panelDef: PanelDefinition,
  defsById: Map<string, PanelDefinition>,
  rotation: RotationDeg = 0
): { localXMm: number, localYMm: number } | null {
  const size = occupiedSizeMm(panelDef, rotation)
  const existing = panelRectsOnWall(wall, defsById)
  if (existing.length === 0) {
    return { localXMm: 0, localYMm: 0 }
  }

  const candidates: Array<{ xMm: number, yMm: number, score: number }> = []
  const seen = new Set<string>()

  function addCandidate(xMm: number, yMm: number, score: number) {
    const key = `${Math.round(xMm)},${Math.round(yMm)}`
    if (seen.has(key)) return
    seen.add(key)
    if (!isFreeOnWall(wall, defsById, xMm, yMm, size.widthMm, size.heightMm)) return
    candidates.push({ xMm, yMm, score })
  }

  let minX = Infinity
  let minY = Infinity
  for (const r of existing) {
    minX = Math.min(minX, r.xMm)
    minY = Math.min(minY, r.yMm)
    addCandidate(r.xMm + r.widthMm, r.yMm, r.xMm + r.yMm)
    addCandidate(r.xMm, r.yMm + r.heightMm, r.xMm + r.yMm)
  }

  addCandidate(minX, minY, 0)
  addCandidate(minX + size.widthMm, minY, size.widthMm)
  addCandidate(minX, minY + size.heightMm, size.heightMm)

  if (candidates.length === 0) {
    const maxX = Math.max(...existing.map(r => r.xMm + r.widthMm))
    const maxY = Math.max(...existing.map(r => r.yMm + r.heightMm))
    if (
      isFreeOnWall(wall, defsById, maxX, minY, size.widthMm, size.heightMm)
    ) {
      return { localXMm: maxX, localYMm: minY }
    }
    if (
      isFreeOnWall(wall, defsById, minX, maxY, size.widthMm, size.heightMm)
    ) {
      return { localXMm: minX, localYMm: maxY }
    }
    return null
  }

  candidates.sort((a, b) => a.score - b.score)
  const best = candidates[0]!
  return { localXMm: best.xMm, localYMm: best.yMm }
}
