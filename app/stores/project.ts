import { defineStore } from 'pinia'
import {
  buildRectangularGrid,
  preservePanelsOnResize
} from '#shared/calculations/dimensions'
import { clonePresetsForProject } from '#shared/panel-presets'
import type { PanelDefinition, PanelInstance, RotationDeg } from '#shared/types/panel'
import type { LEDWall } from '#shared/types/wall'
import { SCHEMA_VERSION, type LEDWallProject } from '#shared/types/project'
import { createId } from '#shared/utils/id'

export const useProjectStore = defineStore('project', {
  state: () => ({
    project: createEmptyProject()
  }),
  getters: {
    walls: s => s.project.walls,
    panelDefinitions: s => s.project.panelDefinitions,
    defsById: s =>
      new Map(s.project.panelDefinitions.map(d => [d.id, d]))
  },
  actions: {
    newProject(name = 'Neues Projekt') {
      this.project = createEmptyProject(name)
    },
    loadProject(project: LEDWallProject) {
      this.project = project
    },
    renameProject(name: string) {
      this.project.name = name
      this.touch()
    },
    touch() {
      this.project.updatedAt = new Date().toISOString()
    },
    addWall(name?: string) {
      const wall: LEDWall = {
        id: createId('wall'),
        name: name ?? `Wand ${this.project.walls.length + 1}`,
        xMm: 200 + this.project.walls.length * 400,
        yMm: 200,
        panels: [],
        visible: true,
        locked: false
      }
      this.project.walls.push(wall)
      this.touch()
      return wall.id
    },
    removeWall(wallId: string) {
      this.project.walls = this.project.walls.filter(w => w.id !== wallId)
      this.touch()
    },
    duplicateWall(wallId: string) {
      const src = this.project.walls.find(w => w.id === wallId)
      if (!src) return
      const copy: LEDWall = {
        ...JSON.parse(JSON.stringify(src)),
        id: createId('wall'),
        name: `${src.name} (Kopie)`,
        xMm: src.xMm + 800,
        yMm: src.yMm,
        panels: src.panels.map(p => ({ ...p, id: createId('panel') }))
      }
      this.project.walls.push(copy)
      this.touch()
      return copy.id
    },
    updateWall(wallId: string, patch: Partial<LEDWall>) {
      const wall = this.project.walls.find(w => w.id === wallId)
      if (!wall) return
      Object.assign(wall, patch)
      this.touch()
    },
    setRectangularWall(
      wallId: string,
      panelDefId: string,
      columns: number,
      rows: number
    ) {
      const wall = this.project.walls.find(w => w.id === wallId)
      const def = this.project.panelDefinitions.find(d => d.id === panelDefId)
      if (!wall || !def) return
      const grid = buildRectangularGrid(panelDefId, def, columns, rows)
      wall.panels = preservePanelsOnResize(wall.panels, grid, () =>
        createId('panel')
      )
      this.touch()
    },
    addPanel(
      wallId: string,
      panelDefId: string,
      xMm: number,
      yMm: number,
      rotation: RotationDeg = 0
    ) {
      const wall = this.project.walls.find(w => w.id === wallId)
      if (!wall || wall.locked) return null
      const panel: PanelInstance = {
        id: createId('panel'),
        panelDefinitionId: panelDefId,
        xMm,
        yMm,
        rotation,
        enabled: true
      }
      wall.panels.push(panel)
      this.touch()
      return panel.id
    },
    removePanel(wallId: string, panelId: string) {
      const wall = this.project.walls.find(w => w.id === wallId)
      if (!wall) return
      wall.panels = wall.panels.filter(p => p.id !== panelId)
      this.touch()
    },
    updatePanel(
      wallId: string,
      panelId: string,
      patch: Partial<PanelInstance>
    ) {
      const wall = this.project.walls.find(w => w.id === wallId)
      const panel = wall?.panels.find(p => p.id === panelId)
      if (!panel) return
      Object.assign(panel, patch)
      this.touch()
    },
    movePanel(wallId: string, panelId: string, xMm: number, yMm: number) {
      this.updatePanel(wallId, panelId, { xMm, yMm })
    },
    addPanelDefinition(def: PanelDefinition) {
      this.project.panelDefinitions.push(def)
      this.touch()
    },
    updatePanelDefinition(id: string, patch: Partial<PanelDefinition>) {
      const def = this.project.panelDefinitions.find(d => d.id === id)
      if (!def) return
      Object.assign(def, patch, { updatedAt: new Date().toISOString() })
      this.touch()
    },
    removePanelDefinition(id: string) {
      const inUse = this.project.walls.some(w =>
        w.panels.some(p => p.panelDefinitionId === id)
      )
      if (inUse) return false
      this.project.panelDefinitions = this.project.panelDefinitions.filter(
        d => d.id !== id
      )
      this.touch()
      return true
    },
    replaceProjectSnapshot(project: LEDWallProject) {
      this.project = project
    },
    exportProject(): LEDWallProject {
      return JSON.parse(JSON.stringify(this.project))
    }
  }
})

function createEmptyProject(name = 'Neues Projekt'): LEDWallProject {
  const t = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId('project'),
    name,
    walls: [],
    panelDefinitions: clonePresetsForProject(),
    createdAt: t,
    updatedAt: t
  }
}
