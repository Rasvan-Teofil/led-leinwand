import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'
import { useProjectPersistence } from '~/composables/useProjectPersistence'

export function seedDemoProject() {
  const project = useProjectStore()
  const editor = useEditorStore()
  const history = useHistoryStore()
  const persistence = useProjectPersistence()

  project.newProject('LED-Angebotsvergleich')
  const offers = [
    {
      name: 'Angebot 1 · Jinyuan 4×2,5 m (P3.91)',
      xMm: 0,
      squareId: 'jinyuan-p391-500x500',
      tallId: 'jinyuan-p391-500x1000'
    },
    {
      name: 'Angebot 2 · 4×2,5 m (P2.6)',
      xMm: 5000,
      squareId: 'offer-2-p26-500x500',
      tallId: 'offer-2-p26-500x1000'
    }
  ]

  history.pushHistory()
  for (const offer of offers) {
    const wallId = project.addWall(offer.name)
    project.updateWall(wallId, {
      xMm: offer.xMm,
      yMm: 0,
      panelLayoutMode: 'auto'
    })
    for (let col = 0; col < 8; col++) {
      const x = col * 500
      project.addPanel(wallId, offer.tallId, x, 0)
      project.addPanel(wallId, offer.tallId, x, 1000)
      project.addPanel(wallId, offer.squareId, x, 2000)
    }
  }
  history.pushHistory()
  persistence.autosave()
  if (project.walls[0]) {
    editor.selectWall(project.walls[0].id)
  }
}

export function resetDemoProject() {
  localStorage.removeItem('led-wall-designer:project')
  seedDemoProject()
}
