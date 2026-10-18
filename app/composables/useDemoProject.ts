import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'
import { useProjectPersistence } from '~/composables/useProjectPersistence'

export function seedDemoProject() {
  const project = useProjectStore()
  const editor = useEditorStore()
  const history = useHistoryStore()
  const persistence = useProjectPersistence()

  project.newProject('Demo LED Projekt')
  const jinyuan500 = project.panelDefinitions.find(d => d.id === 'jinyuan-p391-500x500')
  const jinyuan1000 = project.panelDefinitions.find(d => d.id === 'jinyuan-p391-500x1000')
  const generic500 = project.panelDefinitions.find(d => d.id.startsWith('preset-500x500'))
  if (!jinyuan500 || !jinyuan1000 || !generic500) return

  history.pushHistory()
  const rectId = project.addWall('Jinyuan 4×2,5 m')
  if (rectId) {
    project.updateWall(rectId, { xMm: 0, yMm: 0 })
    for (let col = 0; col < 8; col++) {
      const x = col * 500
      project.addPanel(rectId, jinyuan1000.id, x, 0)
      project.addPanel(rectId, jinyuan1000.id, x, 1000)
      project.addPanel(rectId, jinyuan500.id, x, 2000)
    }
  }

  const lId = project.addWall('L-Form Irregular')
  if (lId) {
    project.updateWall(lId, { xMm: 5000, yMm: 0 })
    const positions: Array<[number, number]> = [
      [0, 0],
      [500, 0],
      [1000, 0],
      [0, 500],
      [0, 1000],
      [500, 1000],
      [1000, 500]
    ]
    for (const [x, y] of positions) {
      project.addPanel(lId, generic500.id, x, y)
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
