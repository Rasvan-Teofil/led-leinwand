import { occupiedSizeMm } from '#shared/types/panel'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

export interface LedDesignerTestHooks {
  editor: ReturnType<typeof useEditorStore>
  project: ReturnType<typeof useProjectStore>
  getPanelClientCenter: (wallId: string, panelId: string) => { x: number, y: number } | null
}

function getPanelClientCenter(wallId: string, panelId: string) {
  const canvas = document.querySelector('[data-testid="canvas-container"] canvas')
  if (!canvas) return null
  const bounds = canvas.getBoundingClientRect()
  const project = useProjectStore()
  const editor = useEditorStore()
  const wall = project.walls.find(w => w.id === wallId)
  const panel = wall?.panels.find(p => p.id === panelId)
  if (!wall || !panel) return null
  const def = project.defsById.get(panel.panelDefinitionId)
  if (!def) return null
  const occ = occupiedSizeMm(def, panel.rotation)
  const z = editor.zoom
  const gx = editor.panX + wall.xMm * z
  const gy = editor.panY + wall.yMm * z
  const cx = gx + panel.xMm * z + (occ.widthMm * z) / 2
  const cy = gy + panel.yMm * z + (occ.heightMm * z) / 2
  return { x: bounds.left + cx, y: bounds.top + cy }
}

export default defineNuxtPlugin(() => {
  const hooks: LedDesignerTestHooks = {
    editor: useEditorStore(),
    project: useProjectStore(),
    getPanelClientCenter
  }
  ;(window as Window & { __ledDesignerTest?: LedDesignerTestHooks }).__ledDesignerTest = hooks
})
