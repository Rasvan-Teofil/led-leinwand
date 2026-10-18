import { occupiedSizeMm } from '#shared/types/panel'
import { useDeleteActions } from '~/composables/useDeleteActions'
import { usePanelSnap } from '~/composables/usePanelSnap'
import { useWallLayoutMode } from '~/composables/useWallLayoutMode'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

const NUDGE_MM = 50
const NUDGE_SHIFT_MM = 500

export function useKeyboardShortcuts() {
  const editor = useEditorStore()
  const history = useHistoryStore()
  const project = useProjectStore()
  const { deletePanel } = useDeleteActions()
  const { snapOnWallLocal, isWorldTopLeftFree } = usePanelSnap()
  const { ensureManualLayout } = useWallLayoutMode()

  function nudgeSelectedPanel(dxMm: number, dyMm: number) {
    const panelId = editor.primaryPanelId
    const wallId = editor.primaryWallId
    if (!panelId || !wallId) return
    const wall = project.walls.find(w => w.id === wallId)
    const panel = wall?.panels.find(p => p.id === panelId)
    if (!wall || !panel || wall.locked) return
    const def = project.defsById.get(panel.panelDefinitionId)
    if (!def) return
    ensureManualLayout(wallId)
    const origin = { xMm: panel.xMm, yMm: panel.yMm }
    const snapped = snapOnWallLocal(
      wallId,
      panel.xMm + dxMm,
      panel.yMm + dyMm,
      panel.panelDefinitionId,
      panel.rotation,
      panelId,
      origin
    )
    const targetWall = project.walls.find(w => w.id === snapped.wallId) ?? wall
    const size = occupiedSizeMm(def, panel.rotation)
    const worldX = targetWall.xMm + snapped.localXMm
    const worldY = targetWall.yMm + snapped.localYMm
    if (
      !isWorldTopLeftFree(worldX, worldY, size.widthMm, size.heightMm, panelId)
    ) {
      return
    }
    history.withTransaction(() => {
      if (snapped.wallId === wallId) {
        project.movePanel(wallId, panelId, snapped.localXMm, snapped.localYMm)
      } else {
        project.movePanelToWall(
          wallId,
          panelId,
          snapped.wallId,
          snapped.localXMm,
          snapped.localYMm
        )
        editor.selectPanel(snapped.wallId, panelId)
      }
    })
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }
    if (e.code === 'Space') {
      editor.spacePanning = true
      e.preventDefault()
    }
    if (e.key === 'Alt') {
      editor.snapOverrideDisabled = true
    }
    if (e.key === 'v' || e.key === 'V') {
      editor.setCanvasTool('select')
    }
    if (e.key === 'h' || e.key === 'H') {
      editor.setCanvasTool('hand')
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      history.undo()
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      history.redo()
    }
    if (e.key === 'Escape') {
      editor.clearSelection()
      editor.dragPanelDefinitionId = null
      editor.contextMenu = null
    }
    if (
      e.key === 'ArrowLeft'
      || e.key === 'ArrowRight'
      || e.key === 'ArrowUp'
      || e.key === 'ArrowDown'
    ) {
      if (!editor.primaryPanelId) return
      e.preventDefault()
      const step = e.shiftKey ? NUDGE_SHIFT_MM : NUDGE_MM
      const dx
        = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy
        = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      nudgeSelectedPanel(dx, dy)
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      const panelIds = [...editor.selection.panelIds]
      if (panelIds.length > 1) {
        history.pushHistory()
        for (const pid of panelIds) {
          const host = project.walls.find(w => w.panels.some(p => p.id === pid))
          if (host) project.removePanel(host.id, pid)
        }
        editor.selection.panelIds = []
        if (editor.primaryWallId) {
          editor.selectWall(editor.primaryWallId)
        } else {
          editor.clearSelection()
        }
        history.pushHistory()
        return
      }
      const wallId = editor.primaryWallId
      if (!wallId) return
      if (editor.primaryPanelId) {
        deletePanel(wallId, editor.primaryPanelId)
      } else {
        editor.requestDeleteWall(wallId)
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      editor.spacePanning = false
    }
    if (e.key === 'Alt') {
      editor.snapOverrideDisabled = false
    }
  }

  return { onKeyDown, onKeyUp }
}
