import type { PanelDefinition, PanelInstance, RotationDeg } from '../types/panel'
import { occupiedSizeMm } from '../types/panel'
import type { LEDWall } from '../types/wall'

export interface RectMm {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

export interface PanelRect extends RectMm {
  panelId: string
  panelDefinitionId: string
  rotation: RotationDeg
}

export function panelWorldRect(
  wall: LEDWall,
  panel: PanelInstance,
  def: PanelDefinition
): PanelRect {
  const size = occupiedSizeMm(def, panel.rotation)
  return {
    panelId: panel.id,
    panelDefinitionId: panel.panelDefinitionId,
    rotation: panel.rotation,
    xMm: wall.xMm + panel.xMm,
    yMm: wall.yMm + panel.yMm,
    widthMm: size.widthMm,
    heightMm: size.heightMm
  }
}

export function getEnabledPanelRects(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>
): PanelRect[] {
  return wall.panels
    .filter(p => p.enabled)
    .map((p) => {
      const def = defsById.get(p.panelDefinitionId)
      if (!def) return null
      return panelWorldRect(wall, p, def)
    })
    .filter(Boolean) as PanelRect[]
}

export function unionBoundingBox(rects: RectMm[]): RectMm | null {
  if (rects.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.xMm)
    minY = Math.min(minY, r.yMm)
    maxX = Math.max(maxX, r.xMm + r.widthMm)
    maxY = Math.max(maxY, r.yMm + r.heightMm)
  }
  return {
    xMm: minX,
    yMm: minY,
    widthMm: maxX - minX,
    heightMm: maxY - minY
  }
}

export function wallLocalBoundingBox(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>
): RectMm | null {
  const rects = wall.panels
    .filter(p => p.enabled)
    .map((p) => {
      const def = defsById.get(p.panelDefinitionId)
      if (!def) return null
      const size = occupiedSizeMm(def, p.rotation)
      return {
        xMm: p.xMm,
        yMm: p.yMm,
        widthMm: size.widthMm,
        heightMm: size.heightMm
      }
    })
    .filter(Boolean) as RectMm[]
  return unionBoundingBox(rects)
}

export function rectsOverlap(a: RectMm, b: RectMm): boolean {
  return (
    a.xMm < b.xMm + b.widthMm
    && a.xMm + a.widthMm > b.xMm
    && a.yMm < b.yMm + b.heightMm
    && a.yMm + a.heightMm > b.yMm
  )
}

export interface OverlapPair {
  panelAId: string
  panelBId: string
}

export function detectOverlaps(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>
): OverlapPair[] {
  const rects = getEnabledPanelRects(wall, defsById)
  const pairs: OverlapPair[] = []
  for (let i = 0; i < rects.length; i++) {
    const a = rects[i]!
    for (let j = i + 1; j < rects.length; j++) {
      const b = rects[j]!
      if (rectsOverlap(a, b)) {
        pairs.push({
          panelAId: a.panelId,
          panelBId: b.panelId
        })
      }
    }
  }
  return pairs
}

function mergeIntervals(intervals: Array<[number, number]>): number {
  if (intervals.length === 0) return 0
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  let length = 0
  let curStart = sorted[0]![0]
  let curEnd = sorted[0]![1]
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i]!
    if (s <= curEnd) {
      curEnd = Math.max(curEnd, e)
    } else {
      length += curEnd - curStart
      curStart = s
      curEnd = e
    }
  }
  length += curEnd - curStart
  return length
}

/** Union area of axis-aligned rectangles (mm²), overlaps counted once. */
export function unionAreaMm2FromRects(rects: RectMm[]): number {
  if (rects.length === 0) return 0
  const yEdges = new Set<number>()
  for (const r of rects) {
    yEdges.add(r.yMm)
    yEdges.add(r.yMm + r.heightMm)
  }
  const ys = [...yEdges].sort((a, b) => a - b)
  let area = 0
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[i]!
    const y1 = ys[i + 1]!
    const bandH = y1 - y0
    if (bandH <= 0) continue
    const intervals: Array<[number, number]> = []
    for (const r of rects) {
      if (r.yMm < y1 && r.yMm + r.heightMm > y0) {
        intervals.push([r.xMm, r.xMm + r.widthMm])
      }
    }
    area += bandH * mergeIntervals(intervals)
  }
  return area
}

export function activeAreaMm2(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>
): number {
  const rects: RectMm[] = []
  for (const panel of wall.panels) {
    if (!panel.enabled) continue
    const def = defsById.get(panel.panelDefinitionId)
    if (!def) continue
    const { widthMm, heightMm } = occupiedSizeMm(def, panel.rotation)
    rects.push({
      xMm: panel.xMm,
      yMm: panel.yMm,
      widthMm,
      heightMm
    })
  }
  return unionAreaMm2FromRects(rects)
}

export function mm2ToM2(mm2: number): number {
  return mm2 / 1_000_000
}

export function snapValue(value: number, gridMm: number): number {
  if (gridMm <= 0) return value
  return Math.round(value / gridMm) * gridMm
}
