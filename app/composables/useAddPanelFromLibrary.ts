import { findNextPanelPlacementOnWall } from '#shared/calculations/panel-placement'
import { occupiedSizeMm } from '#shared/types/panel'
import { usePanelSnap } from '~/composables/usePanelSnap'
import { useWallLayoutMode } from '~/composables/useWallLayoutMode'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

export function useAddPanelFromLibrary() {
  const project = useProjectStore()
  const editor = useEditorStore()
  const history = useHistoryStore()
  const toast = useToast()
  const { snapOnWallLocal, snapFromPointerClient, isWorldTopLeftFree } = usePanelSnap()
  const { ensureManualLayout } = useWallLayoutMode()

  function resolveTargetWallId(preferredWallId?: string | null) {
    if (preferredWallId) {
      const w = project.walls.find(wall => wall.id === preferredWallId)
      if (w && !w.locked) return w.id
    }
    const selected = editor.primaryWallId
    if (selected) {
      const w = project.walls.find(wall => wall.id === selected)
      if (w && !w.locked) return w.id
    }
    const first = project.walls.find(w => !w.locked && w.visible)
    return first?.id ?? null
  }

  function addDefinitionToWall(
    panelDefId: string,
    options?: { wallId?: string | null, clientX?: number, clientY?: number }
  ): string | null {
    const def = project.defsById.get(panelDefId)
    if (!def) return null

    let placementWallId: string | null = null
    let localXMm = 0
    let localYMm = 0
    if (options?.clientX != null && options?.clientY != null) {
      const fromPointer = snapFromPointerClient(
        options.clientX,
        options.clientY,
        panelDefId,
        0
      )
      if (!fromPointer) return null
      placementWallId = fromPointer.wallId
      localXMm = fromPointer.localXMm
      localYMm = fromPointer.localYMm
    } else {
      const wallId = resolveTargetWallId(options?.wallId)
      if (!wallId) {
        toast.add({
          title: 'Keine Wand',
          description: 'Bitte zuerst eine Wand auswählen.',
          color: 'warning'
        })
        return null
      }
      const wall = project.walls.find(w => w.id === wallId)
      if (!wall) return null
      const next = findNextPanelPlacementOnWall(wall, def, project.defsById, 0)
      if (!next) {
        toast.add({
          title: 'Kein Platz',
          description: 'Auf dieser Wand ist kein freier Bereich für ein weiteres Panel.',
          color: 'warning'
        })
        return null
      }
      const snapped = snapOnWallLocal(
        wallId,
        next.localXMm,
        next.localYMm,
        panelDefId,
        0
      )
      placementWallId = snapped.wallId
      localXMm = snapped.localXMm
      localYMm = snapped.localYMm
    }

    const targetWall = project.walls.find(w => w.id === placementWallId)
    if (!targetWall || targetWall.locked) return null
    const size = occupiedSizeMm(def, 0)
    let worldX = targetWall.xMm + localXMm
    let worldY = targetWall.yMm + localYMm
    if (!isWorldTopLeftFree(worldX, worldY, size.widthMm, size.heightMm)) {
      const next = findNextPanelPlacementOnWall(
        targetWall,
        def,
        project.defsById,
        0
      )
      if (!next) {
        toast.add({
          title: 'Überlappung',
          description: 'Panel kann hier nicht platziert werden.',
          color: 'warning'
        })
        return null
      }
      const snapped = snapOnWallLocal(
        targetWall.id,
        next.localXMm,
        next.localYMm,
        panelDefId,
        0
      )
      placementWallId = snapped.wallId
      localXMm = snapped.localXMm
      localYMm = snapped.localYMm
      const retryWall = project.walls.find(w => w.id === placementWallId)!
      worldX = retryWall.xMm + localXMm
      worldY = retryWall.yMm + localYMm
      if (!isWorldTopLeftFree(worldX, worldY, size.widthMm, size.heightMm)) {
        toast.add({
          title: 'Überlappung',
          description: 'Panel kann hier nicht platziert werden.',
          color: 'warning'
        })
        return null
      }
    }

    ensureManualLayout(placementWallId)
    let newId: string | null = null
    history.withTransaction(() => {
      newId = project.addPanel(placementWallId!, panelDefId, localXMm, localYMm)
      if (newId) {
        editor.selectPanel(placementWallId!, newId)
      }
    })
    return newId
  }

  return { addDefinitionToWall, resolveTargetWallId }
}
