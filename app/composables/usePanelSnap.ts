import {
  collectNeighborRects,
  DEFAULT_SNAP_THRESHOLD_PX,
  resolveMagneticSnap,
  worldPointToWallLocal,
  type MagneticSnapResult,
  type SnapGuideLine
} from '#shared/calculations/magnetic-snap'
import { occupiedSizeMm } from '#shared/types/panel'
import type { RotationDeg } from '#shared/types/panel'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

export interface WallSnapPlacement {
  wallId: string
  localXMm: number
  localYMm: number
  guides: SnapGuideLine[]
  mode: MagneticSnapResult['mode']
}

export function usePanelSnap() {
  const project = useProjectStore()
  const editor = useEditorStore()

  function neighbors() {
    return collectNeighborRects(project.walls, project.defsById)
  }

  function snapWorldTopLeft(
    worldXMm: number,
    worldYMm: number,
    widthMm: number,
    heightMm: number,
    excludePanelId?: string
  ): MagneticSnapResult {
    const snapOn = editor.preferences.snapEnabled
      && !editor.snapOverrideDisabled
    return resolveMagneticSnap({
      proposedXMm: worldXMm,
      proposedYMm: worldYMm,
      widthMm,
      heightMm,
      zoom: editor.zoom,
      thresholdPx: DEFAULT_SNAP_THRESHOLD_PX,
      gridMm: editor.preferences.snapMm,
      magneticEnabled: snapOn,
      gridSnapEnabled: snapOn,
      neighbors: neighbors(),
      excludePanelId
    })
  }

  function snapOnWallLocal(
    wallId: string,
    localXMm: number,
    localYMm: number,
    panelDefId: string,
    rotation: RotationDeg,
    excludePanelId?: string
  ): WallSnapPlacement {
    const wall = project.walls.find(w => w.id === wallId)
    const def = project.defsById.get(panelDefId)
    if (!wall || !def) {
      return { wallId, localXMm, localYMm, guides: [], mode: 'none' }
    }
    const size = occupiedSizeMm(def, rotation)
    const result = snapWorldTopLeft(
      wall.xMm + localXMm,
      wall.yMm + localYMm,
      size.widthMm,
      size.heightMm,
      excludePanelId
    )
    const targetWallId = result.referenceWallId ?? wallId
    const targetWall = project.walls.find(w => w.id === targetWallId) ?? wall
    return {
      wallId: targetWall.id,
      localXMm: result.xMm - targetWall.xMm,
      localYMm: result.yMm - targetWall.yMm,
      guides: result.guides,
      mode: result.mode
    }
  }

  function snapFromPointerClient(
    clientX: number,
    clientY: number,
    panelDefId: string,
    rotation: RotationDeg,
    excludePanelId?: string
  ): WallSnapPlacement | null {
    const canvas = document.querySelector('[data-testid="canvas-container"] canvas')
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    const stageX = clientX - bounds.left
    const stageY = clientY - bounds.top
    const def = project.defsById.get(panelDefId)
    if (!def) return null
    const size = occupiedSizeMm(def, rotation)
    const worldCenterX = (stageX - editor.panX) / editor.zoom
    const worldCenterY = (stageY - editor.panY) / editor.zoom
    const result = snapWorldTopLeft(
      worldCenterX - size.widthMm / 2,
      worldCenterY - size.heightMm / 2,
      size.widthMm,
      size.heightMm,
      excludePanelId
    )
    const placement = worldPointToWallLocal(
      result.xMm + size.widthMm / 2,
      result.yMm + size.heightMm / 2,
      project.walls
    )
    if (!placement) return null
    const targetWallId = result.referenceWallId ?? placement.wallId
    const targetWall = project.walls.find(w => w.id === targetWallId)
    if (!targetWall) return null
    return {
      wallId: targetWall.id,
      localXMm: result.xMm - targetWall.xMm,
      localYMm: result.yMm - targetWall.yMm,
      guides: result.guides,
      mode: result.mode
    }
  }

  return {
    snapOnWallLocal,
    snapFromPointerClient,
    snapWorldTopLeft
  }
}
