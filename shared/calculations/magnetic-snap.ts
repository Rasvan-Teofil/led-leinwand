import type { PanelDefinition, RotationDeg } from '../types/panel'
import { occupiedSizeMm } from '../types/panel'
import type { RectMm } from './geometry'
import { rectsOverlap, snapValue } from './geometry'

export const DEFAULT_SNAP_THRESHOLD_PX = 12

export interface SnapNeighborRect extends RectMm {
  panelId: string
  wallId: string
}

export interface MagneticSnapOptions {
  proposedXMm: number
  proposedYMm: number
  widthMm: number
  heightMm: number
  zoom: number
  thresholdPx: number
  gridMm: number
  magneticEnabled: boolean
  gridSnapEnabled: boolean
  neighbors: SnapNeighborRect[]
  excludePanelId?: string
  fallbackXMm?: number
  fallbackYMm?: number
}

export interface SnapGuideLine {
  /** World-space mm */
  orientation: 'horizontal' | 'vertical'
  positionMm: number
  startMm: number
  endMm: number
}

export interface MagneticSnapResult {
  xMm: number
  yMm: number
  mode: 'magnetic' | 'grid' | 'none'
  guides: SnapGuideLine[]
  /** Wall of the panel used as snap reference (magnetic only). */
  referenceWallId?: string
}

function rectAt(xMm: number, yMm: number, w: number, h: number): RectMm {
  return { xMm, yMm, widthMm: w, heightMm: h }
}

function distancePx(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  zoom: number
): number {
  const dx = (ax - bx) * zoom
  const dy = (ay - by) * zoom
  return Math.hypot(dx, dy)
}

function overlapsNeighbors(
  candidate: RectMm,
  neighbors: SnapNeighborRect[],
  excludePanelId?: string
): boolean {
  for (const n of neighbors) {
    if (excludePanelId && n.panelId === excludePanelId) continue
    if (rectsOverlap(candidate, n)) return true
  }
  return false
}

interface Candidate {
  xMm: number
  yMm: number
  distPx: number
  guides: SnapGuideLine[]
  referenceWallId?: string
}

function guideSpan(
  a: RectMm,
  b: RectMm,
  orientation: 'horizontal' | 'vertical'
): SnapGuideLine {
  if (orientation === 'vertical') {
    const x = a.xMm
    const y1 = Math.min(a.yMm, b.yMm)
    const y2 = Math.max(a.yMm + a.heightMm, b.yMm + b.heightMm)
    return { orientation: 'vertical', positionMm: x, startMm: y1, endMm: y2 }
  }
  const y = a.yMm
  const x1 = Math.min(a.xMm, b.xMm)
  const x2 = Math.max(a.xMm + a.widthMm, b.xMm + b.widthMm)
  return { orientation: 'horizontal', positionMm: y, startMm: x1, endMm: x2 }
}

function pushCandidate(
  list: Candidate[],
  xMm: number,
  yMm: number,
  w: number,
  h: number,
  proposedX: number,
  proposedY: number,
  zoom: number,
  guides: SnapGuideLine[],
  referenceWallId?: string
) {
  const distPx = distancePx(xMm, yMm, proposedX, proposedY, zoom)
  list.push({ xMm, yMm, distPx, guides, referenceWallId })
}

function magneticCandidates(
  proposedX: number,
  proposedY: number,
  w: number,
  h: number,
  zoom: number,
  neighbors: SnapNeighborRect[],
  excludePanelId?: string
): Candidate[] {
  const out: Candidate[] = []

  for (const s of neighbors) {
    if (excludePanelId && s.panelId === excludePanelId) continue

    const yTops = [s.yMm, s.yMm + s.heightMm - h, s.yMm + (s.heightMm - h) / 2]
    const xLefts = [s.xMm, s.xMm + s.widthMm - w, s.xMm + (s.widthMm - w) / 2]

    // Right of S (M.left = S.right)
    for (const y of yTops) {
      const x = s.xMm + s.widthMm
      const m = rectAt(x, y, w, h)
      pushCandidate(out, x, y, w, h, proposedX, proposedY, zoom, [
        guideSpan(s, m, 'vertical'),
        guideSpan(s, m, 'horizontal')
      ], s.wallId)
    }
    // Left of S
    for (const y of yTops) {
      const x = s.xMm - w
      const m = rectAt(x, y, w, h)
      pushCandidate(out, x, y, w, h, proposedX, proposedY, zoom, [
        guideSpan(s, m, 'vertical'),
        guideSpan(s, m, 'horizontal')
      ], s.wallId)
    }
    // Below S
    for (const x of xLefts) {
      const y = s.yMm + s.heightMm
      const m = rectAt(x, y, w, h)
      pushCandidate(out, x, y, w, h, proposedX, proposedY, zoom, [
        guideSpan(s, m, 'horizontal'),
        guideSpan(s, m, 'vertical')
      ], s.wallId)
    }
    // Above S
    for (const x of xLefts) {
      const y = s.yMm - h
      const m = rectAt(x, y, w, h)
      pushCandidate(out, x, y, w, h, proposedX, proposedY, zoom, [
        guideSpan(s, m, 'horizontal'),
        guideSpan(s, m, 'vertical')
      ], s.wallId)
    }

    // Edge alignment (same edge), keep drag on other axis from proposal when close
    const alignments: Array<{ x: number, y: number, guides: SnapGuideLine[] }> = [
      {
        x: s.xMm,
        y: proposedY,
        guides: [guideSpan(s, rectAt(s.xMm, proposedY, w, h), 'vertical')]
      },
      {
        x: s.xMm + s.widthMm - w,
        y: proposedY,
        guides: [guideSpan(s, rectAt(s.xMm + s.widthMm - w, proposedY, w, h), 'vertical')]
      },
      {
        x: proposedX,
        y: s.yMm,
        guides: [guideSpan(s, rectAt(proposedX, s.yMm, w, h), 'horizontal')]
      },
      {
        x: proposedX,
        y: s.yMm + s.heightMm - h,
        guides: [guideSpan(s, rectAt(proposedX, s.yMm + s.heightMm - h, w, h), 'horizontal')]
      }
    ]
    for (const a of alignments) {
      pushCandidate(out, a.x, a.y, w, h, proposedX, proposedY, zoom, a.guides, s.wallId)
    }
  }

  // Corner alignments between moving proposal and neighbor corners
  for (const s of neighbors) {
    if (excludePanelId && s.panelId === excludePanelId) continue
    const corners = [
      { x: s.xMm, y: s.yMm },
      { x: s.xMm + s.widthMm, y: s.yMm },
      { x: s.xMm, y: s.yMm + s.heightMm },
      { x: s.xMm + s.widthMm, y: s.yMm + s.heightMm }
    ]
    const mCorners = [
      { ox: 0, oy: 0 },
      { ox: -w, oy: 0 },
      { ox: 0, oy: -h },
      { ox: -w, oy: -h }
    ]
    for (const c of corners) {
      for (const mc of mCorners) {
        const x = c.x + mc.ox
        const y = c.y + mc.oy
        const m = rectAt(x, y, w, h)
        pushCandidate(out, x, y, w, h, proposedX, proposedY, zoom, [
          guideSpan(s, m, 'vertical'),
          guideSpan(s, m, 'horizontal')
        ], s.wallId)
      }
    }
  }

  out.sort((a, b) => a.distPx - b.distPx)
  return out
}

/**
 * Resolve panel top-left (world mm) with magnetic snap to neighbors, then grid fallback.
 */
function isFree(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  neighbors: SnapNeighborRect[],
  excludePanelId?: string
): boolean {
  return !overlapsNeighbors(
    rectAt(xMm, yMm, widthMm, heightMm),
    neighbors,
    excludePanelId
  )
}

export function resolveMagneticSnap(
  options: MagneticSnapOptions
): MagneticSnapResult {
  const {
    proposedXMm,
    proposedYMm,
    widthMm,
    heightMm,
    zoom,
    thresholdPx,
    gridMm,
    magneticEnabled,
    gridSnapEnabled,
    neighbors,
    excludePanelId,
    fallbackXMm,
    fallbackYMm
  } = options

  const fallbackX = fallbackXMm ?? proposedXMm
  const fallbackY = fallbackYMm ?? proposedYMm

  if (magneticEnabled && neighbors.length > 0) {
    const candidates = magneticCandidates(
      proposedXMm,
      proposedYMm,
      widthMm,
      heightMm,
      zoom,
      neighbors,
      excludePanelId
    )
    for (const c of candidates) {
      if (c.distPx > thresholdPx) continue
      if (
        isFree(c.xMm, c.yMm, widthMm, heightMm, neighbors, excludePanelId)
      ) {
        return {
          xMm: c.xMm,
          yMm: c.yMm,
          mode: 'magnetic',
          guides: c.guides,
          referenceWallId: c.referenceWallId
        }
      }
    }
  }

  if (gridSnapEnabled && gridMm > 0) {
    const gx = snapValue(proposedXMm, gridMm)
    const gy = snapValue(proposedYMm, gridMm)
    if (isFree(gx, gy, widthMm, heightMm, neighbors, excludePanelId)) {
      return {
        xMm: gx,
        yMm: gy,
        mode: 'grid',
        guides: []
      }
    }
  }

  if (
    isFree(proposedXMm, proposedYMm, widthMm, heightMm, neighbors, excludePanelId)
  ) {
    return {
      xMm: proposedXMm,
      yMm: proposedYMm,
      mode: 'none',
      guides: []
    }
  }

  return {
    xMm: fallbackX,
    yMm: fallbackY,
    mode: 'none',
    guides: []
  }
}

export interface WallPlacementTarget {
  wallId: string
  localXMm: number
  localYMm: number
}

/** Pick wall whose origin is closest when world point lies outside all bboxes. */
export function worldPointToWallLocal(
  worldXMm: number,
  worldYMm: number,
  walls: Array<{ id: string, xMm: number, yMm: number }>
): WallPlacementTarget | null {
  if (walls.length === 0) return null
  let best = walls[0]!
  let bestDist = Infinity
  for (const w of walls) {
    const dx = worldXMm - w.xMm
    const dy = worldYMm - w.yMm
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      best = w
    }
  }
  return {
    wallId: best.id,
    localXMm: worldXMm - best.xMm,
    localYMm: worldYMm - best.yMm
  }
}

export function collectNeighborRects(
  walls: Array<{
    id: string
    xMm: number
    yMm: number
    panels: Array<{
      id: string
      enabled: boolean
      panelDefinitionId: string
      xMm: number
      yMm: number
      rotation: RotationDeg
    }>
  }>,
  defsById: Map<string, PanelDefinition>
): SnapNeighborRect[] {
  const out: SnapNeighborRect[] = []
  for (const wall of walls) {
    for (const panel of wall.panels) {
      if (!panel.enabled) continue
      const def = defsById.get(panel.panelDefinitionId)
      if (!def) continue
      const size = occupiedSizeMm(def, panel.rotation)
      out.push({
        panelId: panel.id,
        wallId: wall.id,
        xMm: wall.xMm + panel.xMm,
        yMm: wall.yMm + panel.yMm,
        widthMm: size.widthMm,
        heightMm: size.heightMm
      })
    }
  }
  return out
}
