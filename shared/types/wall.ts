import type { PanelInstance } from './panel'

export type TestPatternKind = 'smpte' | 'grid' | 'cabinet' | 'pitch' | 'coverage'

export type WallPanelLayoutMode = 'auto' | 'manual'

export type ResolutionMaskPresetId = 'hd' | 'fullHd' | 'qhd' | 'uhd' | 'custom'

export type ResolutionMaskFitMode = 'contain' | 'cover' | 'oneToOne'

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
  resolutionMaskEnabled?: boolean
  resolutionMaskPreset?: ResolutionMaskPresetId
  resolutionMaskCustomWidthPx?: number
  resolutionMaskCustomHeightPx?: number
  resolutionMaskFitMode?: ResolutionMaskFitMode
  resolutionMaskOffsetLocalXMm?: number
  resolutionMaskOffsetLocalYMm?: number
}
