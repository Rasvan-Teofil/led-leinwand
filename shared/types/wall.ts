import type { PanelInstance } from './panel'

export type TestPatternKind = 'smpte' | 'grid' | 'cabinet' | 'pitch' | 'coverage'

export type WallPanelLayoutMode = 'auto' | 'manual'

export interface LEDWall {
  id: string
  name: string
  xMm: number
  yMm: number
  panels: PanelInstance[]
  visible: boolean
  locked: boolean
  /** Auto raster builder vs free panel editing. Defaults to manual when omitted. */
  panelLayoutMode?: WallPanelLayoutMode
  color?: string
  testPatternEnabled?: boolean
  testPatternKind?: TestPatternKind
}
