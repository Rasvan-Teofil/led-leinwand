import type { PanelDefinition } from '../types/panel'
import type { LEDWall } from '../types/wall'
import { wallLocalBoundingBox } from './geometry'
import {
  resolveMagneticSnap,
  type SnapGuideLine,
  type SnapNeighborRect
} from './magnetic-snap'

export function wallNeighborRects(
  walls: LEDWall[],
  defsById: Map<string, PanelDefinition>,
  excludeWallId: string
): SnapNeighborRect[] {
  const out: SnapNeighborRect[] = []
  for (const wall of walls) {
    if (wall.id === excludeWallId) continue
    const bbox = wallLocalBoundingBox(wall, defsById)
    if (!bbox) continue
    out.push({
      panelId: `wall:${wall.id}`,
      wallId: wall.id,
      xMm: wall.xMm + bbox.xMm,
      yMm: wall.yMm + bbox.yMm,
      widthMm: bbox.widthMm,
      heightMm: bbox.heightMm
    })
  }
  return out
}

export function snapWallOriginMm(
  wall: LEDWall,
  proposedOriginXMm: number,
  proposedOriginYMm: number,
  allWalls: LEDWall[],
  defsById: Map<string, PanelDefinition>,
  zoom: number,
  snapEnabled: boolean,
  gridMm: number,
  fallbackOrigin?: { xMm: number, yMm: number }
): { xMm: number, yMm: number, guides: SnapGuideLine[] } {
  const bbox = wallLocalBoundingBox(wall, defsById)
  if (!bbox) {
    return { xMm: proposedOriginXMm, yMm: proposedOriginYMm, guides: [] }
  }
  const proposedWorldX = proposedOriginXMm + bbox.xMm
  const proposedWorldY = proposedOriginYMm + bbox.yMm
  const neighbors = wallNeighborRects(allWalls, defsById, wall.id)
  const result = resolveMagneticSnap({
    proposedXMm: proposedWorldX,
    proposedYMm: proposedWorldY,
    widthMm: bbox.widthMm,
    heightMm: bbox.heightMm,
    zoom,
    thresholdPx: 12,
    gridMm,
    magneticEnabled: snapEnabled,
    gridSnapEnabled: snapEnabled,
    neighbors,
    excludePanelId: `wall:${wall.id}`,
    fallbackXMm: fallbackOrigin
      ? fallbackOrigin.xMm + bbox.xMm
      : proposedWorldX,
    fallbackYMm: fallbackOrigin
      ? fallbackOrigin.yMm + bbox.yMm
      : proposedWorldY
  })
  return {
    xMm: result.xMm - bbox.xMm,
    yMm: result.yMm - bbox.yMm,
    guides: result.guides
  }
}
