import { defineStore } from 'pinia'
import type { EditorPreferences } from '#shared/types/project'
import { DEFAULT_EDITOR_PREFERENCES } from '#shared/types/project'

export type EditorView = 'editor' | 'optimizer' | 'preview'

export interface SelectionState {
  wallIds: string[]
  panelIds: string[]
}

export const useEditorStore = defineStore('editor', {
  state: () => ({
    selection: { wallIds: [] as string[], panelIds: [] as string[] },
    hoveredWallId: null as string | null,
    hoveredPanelId: null as string | null,
    zoom: 0.08,
    panX: 80,
    panY: 80,
    preferences: { ...DEFAULT_EDITOR_PREFERENCES } as EditorPreferences,
    spacePanning: false,
    activeView: 'editor' as EditorView,
    dragPanelDefinitionId: null as string | null,
    previewImageDataUrl: null as string | null,
    previewShowOutlines: true,
    previewShowPixelGrid: false,
    previewFitMode: 'contain' as 'contain' | 'cover' | 'stretch',
    optimizerWallTargetId: null as string | null,
    mobileReadOnly: false
  }),
  getters: {
    primaryWallId: s => s.selection.wallIds[0] ?? null,
    primaryPanelId: s => s.selection.panelIds[0] ?? null
  },
  actions: {
    selectWall(wallId: string, additive = false) {
      if (additive) {
        if (!this.selection.wallIds.includes(wallId)) {
          this.selection.wallIds.push(wallId)
        }
      } else {
        this.selection = { wallIds: [wallId], panelIds: [] }
      }
    },
    selectPanel(wallId: string, panelId: string, additive = false) {
      if (additive) {
        const ids = new Set(this.selection.panelIds)
        ids.add(panelId)
        this.selection = { wallIds: [wallId], panelIds: [...ids] }
      } else {
        this.selection = { wallIds: [wallId], panelIds: [panelId] }
      }
    },
    clearSelection() {
      this.selection = { wallIds: [], panelIds: [] }
    },
    setZoom(zoom: number) {
      this.zoom = Math.min(2, Math.max(0.01, zoom))
    },
    setPan(x: number, y: number) {
      this.panX = x
      this.panY = y
    },
    toggleGrid() {
      this.preferences.gridVisible = !this.preferences.gridVisible
    },
    toggleSnap() {
      this.preferences.snapEnabled = !this.preferences.snapEnabled
    },
    setView(view: EditorView) {
      this.activeView = view
    }
  }
})
