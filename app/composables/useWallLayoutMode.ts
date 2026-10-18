import { useProjectStore } from '~/stores/project'

export function useWallLayoutMode() {
  const project = useProjectStore()
  const toast = useToast()

  function ensureManualLayout(wallId: string) {
    const wall = project.walls.find(w => w.id === wallId)
    if (!wall) return
    if (wall.panelLayoutMode === 'auto') {
      project.updateWall(wallId, { panelLayoutMode: 'manual' })
      toast.add({
        title: 'Manueller Wand-Modus',
        description:
          'Panel hinzugefügt oder verschoben — automatisches Raster ist deaktiviert.',
        color: 'info',
        duration: 5000
      })
    }
  }

  return { ensureManualLayout }
}
