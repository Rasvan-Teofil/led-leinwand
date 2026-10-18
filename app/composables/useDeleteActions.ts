import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

export function useDeleteActions() {
  const project = useProjectStore()
  const editor = useEditorStore()
  const history = useHistoryStore()

  function deletePanel(wallId: string, panelId: string) {
    history.pushHistory()
    project.removePanel(wallId, panelId)
    if (editor.primaryPanelId === panelId) {
      editor.selection.panelIds = editor.selection.panelIds.filter(id => id !== panelId)
      if (editor.selection.panelIds.length === 0) {
        editor.selectWall(wallId)
      }
    }
    history.pushHistory()
  }

  function deleteWall(wallId: string) {
    history.pushHistory()
    project.removeWall(wallId)
    if (editor.selection.wallIds.includes(wallId)) {
      editor.clearSelection()
    }
    history.pushHistory()
  }

  return { deletePanel, deleteWall }
}
