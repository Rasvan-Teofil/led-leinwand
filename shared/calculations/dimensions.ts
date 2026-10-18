import type { PanelDefinition } from '../types/panel'
import type { LEDWall } from '../types/wall'
import {
  activeAreaMm2,
  mm2ToM2,
  wallLocalBoundingBox
} from './geometry'

export interface WallDimensions {
  widthMm: number
  heightMm: number
  bboxWidthMm: number
  bboxHeightMm: number
  activeAreaMm2: number
  activeAreaM2: number
  panelCount: number
  enabledPanelCount: number
}

export function getWallDimensions(
  wall: LEDWall,
  defs: PanelDefinition[]
): WallDimensions {
  const defsById = new Map(defs.map(d => [d.id, d]))
  const bbox = wallLocalBoundingBox(wall, defsById)
  const active = activeAreaMm2(wall, defsById)
  const enabled = wall.panels.filter(p => p.enabled)
  return {
    widthMm: bbox?.widthMm ?? 0,
    heightMm: bbox?.heightMm ?? 0,
    bboxWidthMm: bbox?.widthMm ?? 0,
    bboxHeightMm: bbox?.heightMm ?? 0,
    activeAreaMm2: active,
    activeAreaM2: mm2ToM2(active),
    panelCount: wall.panels.length,
    enabledPanelCount: enabled.length
  }
}

export function buildRectangularGrid(
  panelDefId: string,
  def: PanelDefinition,
  columns: number,
  rows: number,
  originX = 0,
  originY = 0
): Array<{
  panelDefinitionId: string
  xMm: number
  yMm: number
  rotation: 0
  enabled: boolean
}> {
  const panels: Array<{
    panelDefinitionId: string
    xMm: number
    yMm: number
    rotation: 0
    enabled: boolean
  }> = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      panels.push({
        panelDefinitionId: panelDefId,
        xMm: originX + col * def.widthMm,
        yMm: originY + row * def.heightMm,
        rotation: 0,
        enabled: true
      })
    }
  }
  return panels
}

export function rectangularWallSizeMm(
  def: PanelDefinition,
  columns: number,
  rows: number
): { widthMm: number, heightMm: number } {
  return {
    widthMm: columns * def.widthMm,
    heightMm: rows * def.heightMm
  }
}

export function preservePanelsOnResize(
  existing: LEDWall['panels'],
  newGrid: ReturnType<typeof buildRectangularGrid>,
  idFactory: () => string
): LEDWall['panels'] {
  const byPos = new Map<string, LEDWall['panels'][number]>(
    existing.map(p => [`${p.xMm},${p.yMm}`, p])
  )
  return newGrid.map((slot) => {
    const key = `${slot.xMm},${slot.yMm}`
    const prev = byPos.get(key)
    if (prev) {
      return { ...prev, panelDefinitionId: slot.panelDefinitionId }
    }
    return {
      id: idFactory(),
      ...slot
    }
  })
}
