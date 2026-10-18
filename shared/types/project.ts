import type { PanelDefinition } from './panel'
import type { LEDWall } from './wall'

export const SCHEMA_VERSION = 1

export interface LEDWallProject {
  schemaVersion: number
  id: string
  name: string
  walls: LEDWall[]
  panelDefinitions: PanelDefinition[]
  createdAt: string
  updatedAt: string
}

export interface EditorPreferences {
  colorMode: 'dark' | 'light' | 'system'
  gridVisible: boolean
  snapEnabled: boolean
  snapMm: number
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  colorMode: 'dark',
  gridVisible: true,
  snapEnabled: true,
  snapMm: 50
}
