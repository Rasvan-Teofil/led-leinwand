import { parseProjectJson, serializeProject } from '#shared/schemas/project'
import type { LEDWallProject } from '#shared/types/project'
import { useProjectStore } from '~/stores/project'
import { useHistoryStore } from '~/stores/history'

const STORAGE_KEY = 'led-wall-designer:project'
const PROJECTS_KEY = 'led-wall-designer:projects'

export interface StoredProjectMeta {
  id: string
  name: string
  updatedAt: string
}

export function useProjectPersistence() {
  const projectStore = useProjectStore()
  const history = useHistoryStore()
  const toast = useToast()

  function autosave() {
    try {
      const data = projectStore.exportProject()
      localStorage.setItem(STORAGE_KEY, serializeProject(data))
      upsertProjectList(data)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        toast.add({
          title: 'Speicher voll',
          description: 'localStorage-Quota erreicht. Bitte Projekt exportieren.',
          color: 'error'
        })
      }
    }
  }

  function loadAutosave(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    try {
      const json = JSON.parse(raw)
      const result = parseProjectJson(json)
      if (!result.ok) return false
      projectStore.loadProject(result.data)
      history.reset()
      return true
    } catch {
      return false
    }
  }

  function saveManual() {
    autosave()
    toast.add({ title: 'Gespeichert', color: 'success' })
  }

  function exportJson(): string {
    return serializeProject(projectStore.exportProject())
  }

  function importJson(text: string): boolean {
    try {
      const json = JSON.parse(text)
      const result = parseProjectJson(json)
      if (!result.ok) {
        toast.add({
          title: 'Import fehlgeschlagen',
          description: result.error.message,
          color: 'error'
        })
        return false
      }
      history.pushHistory()
      projectStore.loadProject(result.data)
      history.pushHistory()
      autosave()
      toast.add({ title: 'Projekt importiert', color: 'success' })
      return true
    } catch {
      toast.add({ title: 'Ungültiges JSON', color: 'error' })
      return false
    }
  }

  function listLocalProjects(): StoredProjectMeta[] {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as StoredProjectMeta[]
    } catch {
      return []
    }
  }

  function upsertProjectList(project: LEDWallProject) {
    const list = listLocalProjects().filter(p => p.id !== project.id)
    list.unshift({
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt
    })
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list.slice(0, 20)))
  }

  function deleteLocalProject(id: string) {
    const list = listLocalProjects().filter(p => p.id !== id)
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list))
    localStorage.removeItem(`${STORAGE_KEY}:${id}`)
  }

  return {
    autosave,
    loadAutosave,
    saveManual,
    exportJson,
    importJson,
    listLocalProjects,
    deleteLocalProject
  }
}
