import { defineStore } from 'pinia'
import type { SnapGuideLine } from '#shared/calculations/magnetic-snap'
import type { EditorPreferences } from '#shared/types/project'
import { DEFAULT_EDITOR_PREFERENCES } from '#shared/types/project'

export type EditorView = 'editor' | 'optimizer' | 'preview'
export type CanvasTool = 'select' | 'hand'

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
    canvasTool: 'select' as CanvasTool,
    activeView: 'editor' as EditorView,
    dragPanelDefinitionId: null as string | null,
    previewImageDataUrl: null as string | null,
    previewShowOutlines: true,
    previewShowPixelGrid: false,
    previewFitMode: 'contain' as 'contain' | 'cover' | 'stretch',
    optimizerWallTargetId: null as string | null,
    mobileReadOnly: false,
    contextMenu: null as {
      x: number
      y: number
      wallId: string
      panelId?: string
    } | null,
    canvasDragging: false,
    canvasDraggingWall: false,
    pendingDeleteWallId: null as string | null,
    snapGuides: [] as SnapGuideLine[],
    snapOverrideDisabled: false,
    libraryDropPreview: null as {
      wallId: string
      localXMm: number
      localYMm: number
      widthMm: number
      heightMm: number
    } | null
  }),
  getters: {
    primaryWallId: s => s.selection.wallIds[0] ?? null,
    primaryPanelId: s => s.selection.panelIds[0] ?? null,
    handPanActive: s => s.canvasTool === 'hand' || s.spacePanning,
    canManipulateObjects: s => s.canvasTool === 'select' && !s.spacePanning
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
    },
    requestDeleteWall(wallId: string) {
      this.pendingDeleteWallId = wallId
    },
    setSnapGuides(guides: SnapGuideLine[]) {
      this.snapGuides = guides
    },
    clearSnapGuides() {
      this.snapGuides = []
    },
    setCanvasTool(tool: CanvasTool) {
      this.canvasTool = tool
    }
  }
})
