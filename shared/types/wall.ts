import type { PanelInstance } from './panel'

export type TestPatternKind = 'smpte' | 'grid' | 'cabinet' | 'pitch'

export interface LEDWall {
  id: string
  name: string
  xMm: number
  yMm: number
  panels: PanelInstance[]
  visible: boolean
  locked: boolean
  color?: string
  testPatternEnabled?: boolean
  testPatternKind?: TestPatternKind
}
