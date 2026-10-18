import { useDeleteActions } from '~/composables/useDeleteActions'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'

export function useKeyboardShortcuts() {
  const editor = useEditorStore()
  const history = useHistoryStore()
  const { deletePanel } = useDeleteActions()

  function onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }
    if (e.code === 'Space') {
      editor.spacePanning = true
      e.preventDefault()
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
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const wallId = editor.primaryWallId
      if (!wallId) return
      e.preventDefault()
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
  }

  return { onKeyDown, onKeyUp }
}
